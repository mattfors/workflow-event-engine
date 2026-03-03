const STATES = {
	IDLE: 'idle',
	PICK_SELECTION: 'pickSelection',
	SCANNING_LOCATION: 'scanningLocation',
	SCANNING_BOX_OPEN: 'scanningBoxOpen',
	CONFIRMING_ATTRIBUTES: 'confirmingAttributes',
	SCANNING_ITEM_CODE: 'scanningItemCode',
	PENDING_PERSIST_COMPLETION: 'pendingPersistCompletion',
	ALL_COMPLETED: 'allCompleted',
};

const STATUS = {
	OPEN: 'open',
	ACTIVE: 'active',
	PENDING_PERSIST: 'pendingPersist',
	COMPLETED: 'completed',
};

function sanitizePick(pick) {
	return {
		id: pick.id,
		assignedUserId: pick.assignedUserId,
		locationCode: pick.locationCode,
		boxCode: pick.boxCode,
		acceptableCodes: Array.isArray(pick.acceptableCodes) ? pick.acceptableCodes : [],
		requiredScanCount: Number.isInteger(pick.requiredScanCount) && pick.requiredScanCount > 0
			? pick.requiredScanCount
			: 1,
		attributes: {
			lotNumber: pick.attributes?.lotNumber ?? '',
			originCode: pick.attributes?.originCode ?? '',
		},
	};
}

function initialRuntimeForPick(pick) {
	const isCompleted = Boolean(pick.completed);
	return {
		status: isCompleted ? STATUS.COMPLETED : STATUS.OPEN,
		currentScanCount: 0,
		confirmedAttributes: {
			lotNumber: pick.attributes?.lotNumber ?? '',
			originCode: pick.attributes?.originCode ?? '',
		},
		startedAtSeq: null,
		completionIntentSeq: null,
		persistedAtSeq: null,
	};
}

function mapPicksById(picks) {
	const picksById = {};
	for (const pick of picks) {
		const sanitized = sanitizePick(pick);
		picksById[sanitized.id] = sanitized;
	}
	return picksById;
}

function mapRuntimeById(picks) {
	const runtimeById = {};
	for (const pick of picks) {
		runtimeById[pick.id] = initialRuntimeForPick(pick);
	}
	return runtimeById;
}

function initialProjection() {
	return {
		state: STATES.IDLE,
		userId: null,
		picksById: {},
		pickOrder: [],
		pickRuntimeById: {},
		currentPickId: null,
		lastError: null,
		lastEvent: null,
	};
}

function withError(state, event, code, message) {
	return {
		...state,
		lastError: {
			code,
			message,
			at: typeof event?.at === 'string' ? event.at : null,
			eventSeq: typeof event?.seq === 'number' ? event.seq : null,
			eventType: typeof event?.type === 'string' ? event.type : 'UNKNOWN',
		},
		lastEvent: typeof event?.type === 'string' ? event.type : 'UNKNOWN',
	};
}

function withSuccessMeta(state, event) {
	return {
		...state,
		lastError: null,
		lastEvent: event.type,
	};
}

function hasRemainingAssignedWork(state) {
	return state.pickOrder.some((pickId) => {
		const pick = state.picksById[pickId];
		const runtime = state.pickRuntimeById[pickId];
		return pick?.assignedUserId === state.userId && runtime && runtime.status !== STATUS.COMPLETED;
	});
}

function nextStateAfterSelection(state) {
	if (!hasRemainingAssignedWork(state)) {
		return STATES.ALL_COMPLETED;
	}
	return STATES.PICK_SELECTION;
}

function validateEnvelope(event) {
	if (!event || typeof event !== 'object') {
		return 'Event must be an object';
	}
	if (typeof event.type !== 'string') {
		return 'Event type must be a string';
	}
	if (typeof event.seq !== 'number') {
		return 'Event seq must be a number';
	}
	if (typeof event.at !== 'string') {
		return 'Event at must be an ISO string';
	}
	return null;
}

function applyEvent(state, event) {
	const envelopeError = validateEnvelope(event);
	if (envelopeError) {
		return { nextState: withError(state, event, 'INVALID_EVENT_ENVELOPE', envelopeError), outputEvents: [] };
	}

	if (event.type === 'PICKS_RELOADED') {
		const rawPicks = Array.isArray(event.picks) ? event.picks : [];
		const picksById = mapPicksById(rawPicks);
		const pickOrder = rawPicks.map((pick) => pick.id);
		const pickRuntimeById = { ...state.pickRuntimeById };

		for (const pickId of pickOrder) {
			if (!pickRuntimeById[pickId]) {
				const rawPick = rawPicks.find((candidate) => candidate.id === pickId);
				pickRuntimeById[pickId] = initialRuntimeForPick(rawPick || picksById[pickId]);
			}
		}

		for (const pickId of Object.keys(pickRuntimeById)) {
			if (!picksById[pickId]) {
				delete pickRuntimeById[pickId];
			}
		}

		const reloadedState = withSuccessMeta({
			...state,
			state: nextStateAfterSelection({ ...state, picksById, pickOrder, pickRuntimeById }),
			userId: event.userId,
			picksById,
			pickOrder,
			pickRuntimeById,
			currentPickId: state.currentPickId && picksById[state.currentPickId] ? state.currentPickId : null,
		}, event);

		return { nextState: reloadedState, outputEvents: [] };
	}

	if (state.state === STATES.IDLE) {
		if (event.type !== 'PICKS_LOADED' && event.type !== 'LOAD_PICKS') {
			return { nextState: withError(state, event, 'EVENT_NOT_ALLOWED', `${event.type} not allowed in idle`), outputEvents: [] };
		}

		const rawPicks = Array.isArray(event.picks) ? event.picks : [];
		const picksById = mapPicksById(rawPicks);
		const pickOrder = rawPicks.map((pick) => pick.id);
		const pickRuntimeById = mapRuntimeById(rawPicks);

		const loadedState = withSuccessMeta({
			...state,
			state: nextStateAfterSelection({
				...state,
				userId: event.userId,
				picksById,
				pickOrder,
				pickRuntimeById,
			}),
			userId: event.userId,
			picksById,
			pickOrder,
			pickRuntimeById,
			currentPickId: null,
		}, event);

		return { nextState: loadedState, outputEvents: [] };
	}

	if (state.state === STATES.PICK_SELECTION) {
		if (event.type !== 'START_PICK') {
			return {
				nextState: withError(state, event, 'EVENT_NOT_ALLOWED', `${event.type} not allowed in pickSelection`),
				outputEvents: [],
			};
		}

		const pick = state.picksById[event.pickId];
		const runtime = state.pickRuntimeById[event.pickId];
		const isStartAllowed = Boolean(
			pick
			&& runtime
			&& pick.assignedUserId === state.userId
			&& runtime.status === STATUS.OPEN,
		);

		if (!isStartAllowed) {
			return {
				nextState: withError(state, event, 'START_NOT_ALLOWED', `Pick ${event.pickId} cannot be started`),
				outputEvents: [],
			};
		}

		const pickRuntimeById = {
			...state.pickRuntimeById,
			[event.pickId]: {
				...runtime,
				status: STATUS.ACTIVE,
				currentScanCount: 0,
				startedAtSeq: event.seq,
			},
		};

		return {
			nextState: withSuccessMeta({
				...state,
				state: STATES.SCANNING_LOCATION,
				currentPickId: event.pickId,
				pickRuntimeById,
			}, event),
			outputEvents: [],
		};
	}

	if (state.state === STATES.SCANNING_LOCATION) {
		if (event.type !== 'SCAN_LOCATION') {
			return {
				nextState: withError(state, event, 'EVENT_NOT_ALLOWED', `${event.type} not allowed in scanningLocation`),
				outputEvents: [],
			};
		}

		const pick = state.picksById[state.currentPickId];
		if (!pick || pick.locationCode !== event.locationCode) {
			return {
				nextState: withError(
					state,
					event,
					'INVALID_LOCATION_SCAN',
					`Location ${event.locationCode} does not match active pick`,
				),
				outputEvents: [],
			};
		}

		return {
			nextState: withSuccessMeta({ ...state, state: STATES.SCANNING_BOX_OPEN }, event),
			outputEvents: [],
		};
	}

	if (state.state === STATES.SCANNING_BOX_OPEN) {
		if (event.type !== 'SCAN_BOX_OPEN') {
			return {
				nextState: withError(state, event, 'EVENT_NOT_ALLOWED', `${event.type} not allowed in scanningBoxOpen`),
				outputEvents: [],
			};
		}

		const pick = state.picksById[state.currentPickId];
		if (!pick || pick.boxCode !== event.boxCode) {
			return {
				nextState: withError(
					state,
					event,
					'INVALID_BOX_SCAN_OPEN',
					`Box ${event.boxCode} does not match active pick`,
				),
				outputEvents: [],
			};
		}

		return {
			nextState: withSuccessMeta({ ...state, state: STATES.CONFIRMING_ATTRIBUTES }, event),
			outputEvents: [],
		};
	}

	if (state.state === STATES.CONFIRMING_ATTRIBUTES) {
		if (event.type !== 'SET_ATTRIBUTES') {
			return {
				nextState: withError(state, event, 'EVENT_NOT_ALLOWED', `${event.type} not allowed in confirmingAttributes`),
				outputEvents: [],
			};
		}

		const pick = state.picksById[state.currentPickId];
		const runtime = state.pickRuntimeById[state.currentPickId];
		if (!pick || !runtime) {
			return {
				nextState: withError(state, event, 'ACTIVE_PICK_MISSING', 'No active pick is selected'),
				outputEvents: [],
			};
		}

		const pickRuntimeById = {
			...state.pickRuntimeById,
			[state.currentPickId]: {
				...runtime,
				confirmedAttributes: {
					lotNumber: event.attributes?.lotNumber ?? runtime.confirmedAttributes.lotNumber,
					originCode: event.attributes?.originCode ?? runtime.confirmedAttributes.originCode,
				},
			},
		};

		return {
			nextState: withSuccessMeta({ ...state, state: STATES.SCANNING_ITEM_CODE, pickRuntimeById }, event),
			outputEvents: [],
		};
	}

	if (state.state === STATES.SCANNING_ITEM_CODE) {
		const pick = state.picksById[state.currentPickId];
		const runtime = state.pickRuntimeById[state.currentPickId];

		if (!pick || !runtime) {
			return {
				nextState: withError(state, event, 'ACTIVE_PICK_MISSING', 'No active pick is selected'),
				outputEvents: [],
			};
		}

		if (event.type === 'SCAN_ITEM_CODE') {
			if (!pick.acceptableCodes.includes(event.code)) {
				return {
					nextState: withError(
						state,
						event,
						'INVALID_ITEM_CODE',
						`Code ${event.code} is not allowed for active pick`,
					),
					outputEvents: [],
				};
			}

			const pickRuntimeById = {
				...state.pickRuntimeById,
				[state.currentPickId]: {
					...runtime,
					currentScanCount: runtime.currentScanCount + 1,
				},
			};

			return {
				nextState: withSuccessMeta({ ...state, pickRuntimeById }, event),
				outputEvents: [],
			};
		}

		if (event.type === 'SCAN_BOX_CLOSE') {
			if (runtime.currentScanCount < pick.requiredScanCount) {
				return {
					nextState: withError(
						state,
						event,
						'REQUIRED_COUNT_NOT_REACHED',
						`Need ${pick.requiredScanCount} scans, currently ${runtime.currentScanCount}`,
					),
					outputEvents: [],
				};
			}

			const updatedRuntime = {
				...runtime,
				status: STATUS.PENDING_PERSIST,
				completionIntentSeq: event.seq,
			};

			const pickRuntimeById = {
				...state.pickRuntimeById,
				[state.currentPickId]: updatedRuntime,
			};

			const outputEvents = [
				{
					type: 'PICK_COMPLETED_INTENT',
					pickId: state.currentPickId,
					userId: state.userId,
					confirmedAttributes: updatedRuntime.confirmedAttributes,
					scanCount: updatedRuntime.currentScanCount,
					requiredScanCount: pick.requiredScanCount,
					completionSeq: event.seq,
					completionAt: event.at,
				},
				{
					type: 'PICK_PERSIST_REQUESTED',
					pickId: state.currentPickId,
					userId: state.userId,
					completionSeq: event.seq,
				},
			];

			return {
				nextState: withSuccessMeta({
					...state,
					state: STATES.PENDING_PERSIST_COMPLETION,
					pickRuntimeById,
				}, event),
				outputEvents,
			};
		}

		return {
			nextState: withError(state, event, 'EVENT_NOT_ALLOWED', `${event.type} not allowed in scanningItemCode`),
			outputEvents: [],
		};
	}

	if (state.state === STATES.PENDING_PERSIST_COMPLETION) {
		const currentPickId = state.currentPickId;
		const runtime = state.pickRuntimeById[currentPickId];

		if (!currentPickId || !runtime) {
			return {
				nextState: withError(state, event, 'ACTIVE_PICK_MISSING', 'No active pick is selected'),
				outputEvents: [],
			};
		}

		if (event.type === 'PICK_PERSIST_SUCCEEDED') {
			if (event.pickId !== currentPickId) {
				return {
					nextState: withError(
						state,
						event,
						'PERSIST_ACK_MISMATCH',
						`Persist ACK pick ${event.pickId} does not match active pick ${currentPickId}`,
					),
					outputEvents: [],
				};
			}

			const pickRuntimeById = {
				...state.pickRuntimeById,
				[currentPickId]: {
					...runtime,
					status: STATUS.COMPLETED,
					persistedAtSeq: event.seq,
				},
			};

			const baseState = {
				...state,
				pickRuntimeById,
				currentPickId: null,
			};

			return {
				nextState: withSuccessMeta({
					...baseState,
					state: nextStateAfterSelection(baseState),
				}, event),
				outputEvents: [],
			};
		}

		if (event.type === 'PICK_PERSIST_FAILED') {
			if (event.pickId !== currentPickId) {
				return {
					nextState: withError(
						state,
						event,
						'PERSIST_ACK_MISMATCH',
						`Persist ACK pick ${event.pickId} does not match active pick ${currentPickId}`,
					),
					outputEvents: [],
				};
			}

			const pickRuntimeById = {
				...state.pickRuntimeById,
				[currentPickId]: {
					...runtime,
					status: STATUS.ACTIVE,
				},
			};

			const nextState = {
				...state,
				state: STATES.SCANNING_ITEM_CODE,
				pickRuntimeById,
				lastError: {
					code: 'PERSIST_FAILED',
					message: event.reason || 'Persistence failed',
					at: event.at,
					eventSeq: event.seq,
					eventType: event.type,
				},
				lastEvent: event.type,
			};

			return {
				nextState,
				outputEvents: [
					{
						type: 'PICK_PERSIST_ERROR_SHOWN',
						pickId: currentPickId,
						reason: event.reason || 'Persistence failed',
					},
				],
			};
		}

		return {
			nextState: withError(state, event, 'EVENT_NOT_ALLOWED', `${event.type} not allowed in pendingPersistCompletion`),
			outputEvents: [],
		};
	}

	if (state.state === STATES.ALL_COMPLETED) {
		if (event.type === 'PICKS_LOADED' || event.type === 'LOAD_PICKS' || event.type === 'PICKS_RELOADED') {
			return applyEvent({ ...initialProjection(), state: STATES.IDLE }, event);
		}

		return {
			nextState: withError(state, event, 'WORKFLOW_COMPLETE', 'All assigned picks are completed'),
			outputEvents: [],
		};
	}

	return {
		nextState: withError(state, event, 'UNKNOWN_STATE', `Unsupported state ${state.state}`),
		outputEvents: [],
	};
}

function replayEvents(events) {
	let projected = initialProjection();
	for (const event of events) {
		projected = applyEvent(projected, event).nextState;
	}
	return projected;
}

function toSnapshot(projected, outputEvents = []) {
	const currentPick = projected.currentPickId ? projected.picksById[projected.currentPickId] : null;
	const currentRuntime = projected.currentPickId ? projected.pickRuntimeById[projected.currentPickId] : null;

	const assignedOpenPicks = projected.pickOrder
		.map((pickId) => {
			const pick = projected.picksById[pickId];
			const runtime = projected.pickRuntimeById[pickId];
			if (!pick || !runtime) {
				return null;
			}
			if (pick.assignedUserId !== projected.userId) {
				return null;
			}
			if (runtime.status !== STATUS.OPEN) {
				return null;
			}
			return {
				...pick,
				runtimeStatus: runtime.status,
			};
		})
		.filter(Boolean);

	const currentPickView = currentPick && currentRuntime
		? {
			...currentPick,
			currentScanCount: currentRuntime.currentScanCount,
			runtimeStatus: currentRuntime.status,
			confirmedAttributes: currentRuntime.confirmedAttributes,
		}
		: null;

	return {
		state: projected.state,
		done: projected.state === STATES.ALL_COMPLETED,
		userId: projected.userId,
		lastEvent: projected.lastEvent,
		lastError: projected.lastError,
		currentPickId: projected.currentPickId,
		currentPick: currentPickView,
		assignedOpenPicks,
		picks: projected.pickOrder.map((pickId) => projected.picksById[pickId]).filter(Boolean),
		pickRuntimeById: projected.pickRuntimeById,
		outputEvents,
	};
}

module.exports = {
	STATES,
	STATUS,
	initialProjection,
	applyEvent,
	replayEvents,
	toSnapshot,
};
