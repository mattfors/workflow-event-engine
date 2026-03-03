import { runNodeReadlineCli } from './adapters/node-readline';
import { createDemoDriver } from './driver';

const driver = createDemoDriver();
runNodeReadlineCli(driver);