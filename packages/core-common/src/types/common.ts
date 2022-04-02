import { OS } from '@opensumi/ide-utils';

export const CommonServerPath = 'CommonServerPath';

export const ICommonServer = Symbol('ICommonServer');

export interface ICommonServer {
  /**
   * 获取后端 OS
   */
  getBackendOS(): Promise<OS.Type>;
}
