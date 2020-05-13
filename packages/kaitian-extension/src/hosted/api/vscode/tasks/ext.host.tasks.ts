import * as vscode from 'vscode';
import { IRPCProtocol } from '@ali/ide-connection';
import { TaskProvider, Task, TaskExecution, TaskFilter } from 'vscode';
import { IDisposable } from '@ali/ide-core-node';
import { Event, CancellationToken, asPromise, CancellationTokenSource, Emitter, DisposableStore, Uri } from '@ali/ide-core-common';
import { IExtensionHostService, IExtensionProps } from '../../../../common';
import { IExtHostTasks, TaskHandlerData, IMainThreadTasks, TaskSetDTO, TaskPresentationOptionsDTO, ProcessExecutionOptionsDTO, ShellExecutionDTO, ProcessExecutionDTO, CustomExecutionDTO, CustomExecution2DTO, ShellExecutionOptionsDTO, TaskFilterDTO, TaskDTO, TaskDefinitionDTO, TaskProcessStartedDTO, TaskExecutionDTO, TaskHandleDTO, TaskProcessEndedDTO } from '../../../../common/vscode/tasks';
import { MainThreadAPIIdentifier, IExtHostTerminal, IExtHostWorkspace } from '../../../../common/vscode';
import { Terminal } from '../ext.host.terminal';
import * as types from '../../../../common/vscode/ext-types';
import { UriComponents } from '@ali/ide-editor/lib/common';
import { toTask, TaskDto } from './taskTypes';

namespace TaskDefinitionDTO {
  export function from(value: vscode.TaskDefinition): TaskDefinitionDTO | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value;
  }
  export function to(value: TaskDefinitionDTO): vscode.TaskDefinition | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value;
  }
}

namespace TaskPresentationOptionsDTO {
  export function from(value: vscode.TaskPresentationOptions): TaskPresentationOptionsDTO | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value;
  }
  export function to(value: TaskPresentationOptionsDTO): vscode.TaskPresentationOptions | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value;
  }
}

namespace ProcessExecutionOptionsDTO {
  export function from(value: vscode.ProcessExecutionOptions): ProcessExecutionOptionsDTO | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value;
  }
  export function to(value: ProcessExecutionOptionsDTO): vscode.ProcessExecutionOptions | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value;
  }
}

namespace ProcessExecutionDTO {
  export function is(value: ShellExecutionDTO | ProcessExecutionDTO | CustomExecutionDTO | CustomExecution2DTO | CustomExecution2DTO | undefined): value is ProcessExecutionDTO {
    if (value) {
      const candidate = value as ProcessExecutionDTO;
      return candidate && !!candidate.process;
    } else {
      return false;
    }
  }
  export function from(value: types.ProcessExecution): ProcessExecutionDTO | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const result: ProcessExecutionDTO = {
      process: value.process,
      args: value.args,
    };
    if (value.options) {
      result.options = ProcessExecutionOptionsDTO.from(value.options);
    }
    return result;
  }
  export function to(value: ProcessExecutionDTO): types.ProcessExecution | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return new types.ProcessExecution(value.process, value.args, value.options);
  }
}

namespace ShellExecutionOptionsDTO {
  export function from(value: vscode.ShellExecutionOptions): ShellExecutionOptionsDTO | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value;
  }
  export function to(value: ShellExecutionOptionsDTO): vscode.ShellExecutionOptions | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value;
  }
}

namespace ShellExecutionDTO {
  export function is(value: ShellExecutionDTO | ProcessExecutionDTO | CustomExecutionDTO | CustomExecution2DTO | undefined): value is ShellExecutionDTO {
    if (value) {
      const candidate = value as ShellExecutionDTO;
      return candidate && (!!candidate.commandLine || !!candidate.command);
    } else {
      return false;
    }
  }
  export function from(value: types.ShellExecution): ShellExecutionDTO | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const result: ShellExecutionDTO = {
    };
    if (value.commandLine !== undefined) {
      result.commandLine = value.commandLine;
    } else {
      result.command = value.command;
      result.args = value.args;
    }
    if (value.options) {
      result.options = ShellExecutionOptionsDTO.from(value.options);
    }
    return result;
  }
  export function to(value: ShellExecutionDTO): types.ShellExecution | undefined {
    if (value === undefined || value === null || (value.command === undefined && value.commandLine === undefined)) {
      return undefined;
    }
    if (value.commandLine) {
      return new types.ShellExecution(value.commandLine, value.options);
    } else {
      return new types.ShellExecution(value.command!, value.args ? value.args : [], value.options);
    }
  }
}

namespace CustomExecutionDTO {
  export function is(value: ShellExecutionDTO | ProcessExecutionDTO | CustomExecutionDTO | CustomExecution2DTO | undefined): value is CustomExecutionDTO {
    if (value) {
      const candidate = value as CustomExecutionDTO;
      return candidate && candidate.customExecution === 'customExecution';
    } else {
      return false;
    }
  }

  export function from(value: types.CustomExecution): CustomExecutionDTO {
    return {
      customExecution: 'customExecution',
    };
  }
}

namespace TaskHandleDTO {
  export function from(value: types.Task): TaskHandleDTO {
    let folder: UriComponents | undefined;
    if (value.scope !== undefined && typeof value.scope !== 'number') {
      folder = value.scope.uri;
    }
    return {
      id: value._id!,
      workspaceFolder: folder!,
    };
  }
}

namespace CustomExecution2DTO {
  export function is(value: ShellExecutionDTO | ProcessExecutionDTO | CustomExecutionDTO | CustomExecution2DTO | undefined): value is CustomExecution2DTO {
    if (value) {
      const candidate = value as CustomExecution2DTO;
      return candidate && candidate.customExecution === 'customExecution2';
    } else {
      return false;
    }
  }

  export function from(value: types.CustomExecution2): CustomExecution2DTO {
    return {
      customExecution: 'customExecution2',
    };
  }
}

namespace TaskDTO {

  export function fromMany(tasks: vscode.Task[], extension: IExtensionProps): TaskDTO[] {
    if (tasks === undefined || tasks === null) {
      return [];
    }
    const result: TaskDTO[] = [];
    for (const task of tasks) {
      const converted = from(task, extension);
      if (converted) {
        result.push(converted);
      }
    }
    return result;
  }

  export function from(value: vscode.Task, extension: IExtensionProps): TaskDTO | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    let execution: ShellExecutionDTO | ProcessExecutionDTO | CustomExecutionDTO | CustomExecution2DTO | undefined;
    if (value.execution instanceof types.ProcessExecution) {
      execution = ProcessExecutionDTO.from(value.execution);
    } else if (value.execution instanceof types.ShellExecution) {
      execution = ShellExecutionDTO.from(value.execution);
    } else if ((value as vscode.Task2).execution2 && (value as vscode.Task2).execution2 instanceof types.CustomExecution) {
      execution = CustomExecutionDTO.from((value as vscode.Task2).execution2 as types.CustomExecution);
    } else if ((value as vscode.Task2).execution2 && (value as vscode.Task2).execution2 instanceof types.CustomExecution2) {
      execution = CustomExecution2DTO.from((value as vscode.Task2).execution2 as types.CustomExecution2);
    }

    const definition: TaskDefinitionDTO | undefined = TaskDefinitionDTO.from(value.definition);
    let scope: number | UriComponents;
    if (value.scope) {
      if (typeof value.scope === 'number') {
        scope = value.scope;
      } else {
        scope = value.scope.uri;
      }
    } else {
      // To continue to support the deprecated task constructor that doesn't take a scope, we must add a scope here:
      scope = types.TaskScope.Workspace;
    }
    if (!definition || !scope) {
      return undefined;
    }
    const group = (value.group as types.TaskGroup) ? (value.group as types.TaskGroup).id : undefined;
    const result: TaskDTO = {
      _id: (value as types.Task)._id!,
      definition,
      name: value.name,
      source: {
        extensionId: extension.id,
        label: value.source,
        scope,
      },
      execution: execution!,
      isBackground: value.isBackground,
      group,
      presentationOptions: TaskPresentationOptionsDTO.from(value.presentationOptions),
      problemMatchers: value.problemMatchers,
      hasDefinedMatchers: (value as types.Task).hasDefinedMatchers,
      runOptions: (value as vscode.Task).runOptions ? (value as vscode.Task).runOptions : { reevaluateOnRerun: true },
    };
    return result;
  }

  export async function to(value: TaskDTO | undefined, extHostWorkspace: IExtHostWorkspace): Promise<types.Task | undefined> {
    if (value === undefined || value === null) {
      return undefined;
    }
    let execution: types.ShellExecution | types.ProcessExecution | undefined;
    if (ProcessExecutionDTO.is(value.execution)) {
      execution = ProcessExecutionDTO.to(value.execution);
    } else if (ShellExecutionDTO.is(value.execution)) {
      execution = ShellExecutionDTO.to(value.execution);
    }
    const definition: vscode.TaskDefinition | undefined = TaskDefinitionDTO.to(value.definition);
    let scope: types.TaskScope.Global | types.TaskScope.Workspace | vscode.WorkspaceFolder | undefined;
    if (value.source) {
      if (value.source.scope !== undefined) {
        if (typeof value.source.scope === 'number') {
          scope = value.source.scope;
        } else {
          scope = extHostWorkspace.getWorkspaceFolder(Uri.from(value.source.scope));
        }
      } else {
        scope = types.TaskScope.Workspace;
      }
    }
    if (!definition || !scope) {
      return undefined;
    }
    const result = new types.Task(definition, scope, value.name!, value.source.label, execution, value.problemMatchers);
    if (value.isBackground !== undefined) {
      result.isBackground = value.isBackground;
    }
    if (value.group !== undefined) {
      result.group = types.TaskGroup.from(value.group);
    }
    if (value.presentationOptions) {
      result.presentationOptions = TaskPresentationOptionsDTO.to(value.presentationOptions)!;
    }
    if (value._id) {
      result._id = value._id;
    }
    return result;
  }
}

/**
 * VS Code 似乎不打算实现？
 */
class TaskExecutionImpl implements vscode.TaskExecution {

  constructor(private readonly _tasks: IExtHostTasks, readonly _id: string, private readonly _task: vscode.Task) {
  }

  public get task(): vscode.Task {
    return this._task;
  }

  public terminate(): void {
    this._tasks.terminateTask(this);
  }

  public fireDidStartProcess(value: TaskProcessStartedDTO): void {
  }

  public fireDidEndProcess(value: TaskProcessEndedDTO): void {
  }
}

class CustomExecutionData implements IDisposable {
  private static waitForDimensionsTimeoutInMs: number = 5000;
  private _cancellationSource?: CancellationTokenSource;
  private readonly _onTaskExecutionComplete: Emitter<CustomExecutionData> = new Emitter<CustomExecutionData>();
  private readonly _disposables = new DisposableStore();
  private terminal?: vscode.Terminal;
  private terminalId?: number;
  public result: number | undefined;

  constructor(
    private readonly customExecution: vscode.CustomExecution,
    private readonly terminalService: IExtHostTerminal) {
  }

  public dispose(): void {
    this._cancellationSource = undefined;
    this._disposables.dispose();
  }

  public get onTaskExecutionComplete(): Event<CustomExecutionData> {
    return this._onTaskExecutionComplete.event;
  }

  private onDidCloseTerminal(terminal: vscode.Terminal): void {
    if ((this.terminal === terminal) && this._cancellationSource) {
      this._cancellationSource.cancel();
    }
  }

  private onDidOpenTerminal(terminal: vscode.Terminal): void {
    if (!(terminal instanceof Terminal)) {
      throw new Error('How could this not be a extension host terminal?');
    }

    if (this.terminalId && terminal.__id === String(this.terminalId)) {
      this.startCallback(this.terminalId);
    }
  }

  public async startCallback(terminalId: number): Promise<void> {
    this.terminalId = terminalId;

    // If we have already started the extension task callback, then
    // do not start it again.
    // It is completely valid for multiple terminals to be opened
    // before the one for our task.
    if (this._cancellationSource) {
      return undefined;
    }

    // @ts-ignore
    const callbackTerminals: vscode.Terminal[] = this.terminalService.terminals.filter((terminal) => terminal._id === terminalId);

    if (!callbackTerminals || callbackTerminals.length === 0) {
      this._disposables.add(this.terminalService.onDidOpenTerminal(this.onDidOpenTerminal.bind(this)));
      return;
    }

    if (callbackTerminals.length !== 1) {
      throw new Error(`Expected to only have one terminal at this point`);
    }

    this.terminal = callbackTerminals[0];
    // const terminalRenderer: vscode.TerminalRenderer = await this.terminalService.resolveTerminalRenderer(terminalId);

    // // If we don't have the maximum dimensions yet, then we need to wait for them (but not indefinitely).
    // // Custom executions will expect the dimensions to be set properly before they are launched.
    // // BUT, due to the API contract VSCode has for terminals and dimensions, they are still responsible for
    // // handling cases where they are not set.
    // if (!terminalRenderer.maximumDimensions) {
    //   const dimensionTimeout: Promise<void> = new Promise((resolve) => {
    //     setTimeout(() => {
    //       resolve();
    //     }, CustomExecutionData.waitForDimensionsTimeoutInMs);
    //   });

    //   let dimensionsRegistration: IDisposable | undefined;
    //   const dimensionsPromise: Promise<void> = new Promise((resolve) => {
    //     dimensionsRegistration = terminalRenderer.onDidChangeMaximumDimensions((newDimensions) => {
    //       resolve();
    //     });
    //   });

    //   await Promise.race([dimensionTimeout, dimensionsPromise]);
    //   if (dimensionsRegistration) {
    //     dimensionsRegistration.dispose();
    //   }
    // }

    // this._cancellationSource = new CancellationTokenSource();
    // this._disposables.add(this._cancellationSource);

    // this._disposables.add(this.terminalService.onDidCloseTerminal(this.onDidCloseTerminal.bind(this)));

    // // Regardless of how the task completes, we are done with this custom execution task.
    // this.customExecution.callback(terminalRenderer, this._cancellationSource.token).then(
    //   (success) => {
    //     this.result = success;
    //     this._onTaskExecutionComplete.fire(this);
    //   }, (rejected) => {
    //     this._onTaskExecutionComplete.fire(this);
    //   });
  }
}

export class ExtHostTasks implements IExtHostTasks {
  private handlerCounter = 0;

  private taskHandlers = new Map<number, TaskHandlerData>();

  private providedCustomExecutions: Map<string, CustomExecutionData>;

  private activeCustomExecutions = new Map<string, CustomExecutionData>();

  private providedCustomExecutions2: Map<string, vscode.CustomExecution2>;

  private activeCustomExecutions2: Map<string, vscode.CustomExecution2>;

  private _taskExecutions: Map<string, TaskExecutionImpl>;

  protected readonly proxy: IMainThreadTasks;

  private readonly _onDidExecuteTask: Emitter<vscode.TaskStartEvent> = new Emitter<vscode.TaskStartEvent>();
  private readonly _onDidTerminateTask: Emitter<vscode.TaskEndEvent> = new Emitter<vscode.TaskEndEvent>();

  private readonly _onDidTaskProcessStarted: Emitter<vscode.TaskProcessStartEvent> = new Emitter<vscode.TaskProcessStartEvent>();
  private readonly _onDidTaskProcessEnded: Emitter<vscode.TaskProcessEndEvent> = new Emitter<vscode.TaskProcessEndEvent>();

  constructor(private rpcProtocol: IRPCProtocol, protected readonly terminalService: IExtHostTerminal, protected readonly extHostWorkspace: IExtHostWorkspace) {
    this.proxy = this.rpcProtocol.getProxy(MainThreadAPIIdentifier.MainThreadTasks);
    this.providedCustomExecutions = new Map();
    this.providedCustomExecutions2 = new Map();
    this.activeCustomExecutions = new Map();
    this.activeCustomExecutions2 = new Map();
    this._taskExecutions = new Map();
  }

  async $onDidStartTask(execution: TaskExecutionDTO, terminalId: number): Promise<void> {
    this._onDidExecuteTask.fire({
      execution: await this.getTaskExecution(execution),
    });
  }

  public get onDidStartTask() {
    return this._onDidExecuteTask.event;
  }

  async $onDidEndTask(execution: TaskExecutionDTO): Promise<void> {
    this._onDidTerminateTask.fire({
      execution: await this.getTaskExecution(execution),
    });
  }

  public get onDidEndTask() {
    return this._onDidTerminateTask.event;
  }

  async $onDidStartTaskProcess(value: TaskProcessStartedDTO): Promise<void> {
    const execution = await this.getTaskExecution(value.id);
    if (execution) {
      this._onDidTaskProcessStarted.fire({
        execution,
        processId: value.processId,
      });
    }
  }

  get onDidStartTaskProcess() {
    return this._onDidTaskProcessStarted.event;
  }

  async $onDidEndTaskProcess(value: TaskProcessEndedDTO): Promise<void> {
    const execution = await this.getTaskExecution(value.id);
    if (execution) {
      this._onDidTaskProcessEnded.fire({
        execution,
        exitCode: value.exitCode,
      });
    }
  }

  get onDidEndTaskProcess() {
    return this._onDidTaskProcessEnded.event;
  }

  get taskExecutions(): ReadonlyArray<vscode.TaskExecution> {
    return [...this._taskExecutions.values()];
  }

  terminateTask(execution: vscode.TaskExecution) {
    return this.proxy.$terminateTask((execution as TaskExecutionImpl)._id);
  }

  registerTaskProvider(type: string, provider: TaskProvider, extension: IExtensionProps): IDisposable {
    const handler = this.handlerCounter += 1;
    this.taskHandlers.set(handler, { type, provider, extension });
    this.proxy.$registerTaskProvider(handler, type);
    return {
      dispose: () => {
        this.taskHandlers.delete(handler);
        this.proxy.$unregisterTaskProvider(type);
      },
    };
  }

  private async getTaskExecution(execution: TaskExecutionDTO | string, task?: vscode.Task): Promise<TaskExecutionImpl> {
    if (typeof execution === 'string') {
      const taskExecution = this._taskExecutions.get(execution);
      if (!taskExecution) {
        throw new Error('Unexpected: The specified task is missing an execution');
      }
      return taskExecution;
    }

    const result: TaskExecutionImpl | undefined = this._taskExecutions.get(execution.id);
    if (result) {
      return result;
    }
    const taskToCreate = task ? task : await TaskDTO.to(execution.task, this.extHostWorkspace);
    if (!taskToCreate) {
      throw new Error('Unexpected: Task does not exist.');
    }
    const createdResult: TaskExecutionImpl = new TaskExecutionImpl(this, execution.id, taskToCreate);
    this._taskExecutions.set(execution.id, createdResult);
    return createdResult;
  }

  executeTask(task: Task, extension: IExtensionProps): Promise<TaskExecution> {
    const tTask = (task as types.Task);
    // We have a preserved ID. So the task didn't change.
    if (tTask._id !== undefined) {
      return this.proxy.$executeTask(TaskHandleDTO.from(tTask)).then((value) => this.getTaskExecution(value, task));
    } else {
      const dto = TaskDTO.from(task, extension);
      if (dto === undefined) {
        return Promise.reject(new Error('Task is not valid'));
      }
      return this.proxy.$executeTask(dto).then((value) => this.getTaskExecution(value, task));
    }
  }

  fetchTasks(filter?: vscode.TaskFilter | undefined): Promise<Task[]> {
    return this.proxy.$fetchTasks(TaskFilterDTO.from(filter)).then(async (values) => {
      const result: vscode.Task[] = [];
      for (const value of values) {
        const task = await TaskDTO.to(value, this.extHostWorkspace);
        if (task) {
          result.push(task);
        }
      }
      return result;
    });
  }

  private async addCustomExecution(taskDTO: TaskDTO, task: vscode.Task2): Promise<void> {
    const taskId = await this.proxy.$createTaskId(taskDTO);
    this.providedCustomExecutions.set(
      taskId,
      new CustomExecutionData((task as vscode.Task2).execution2 as vscode.CustomExecution, this.terminalService),
    );
  }

  private async addCustomExecution2(taskDTO: TaskDTO, task: vscode.Task2): Promise<void> {
    const taskId = await this.proxy.$createTaskId(taskDTO);
    this.providedCustomExecutions2.set(taskId, (task as vscode.Task2).execution2 as vscode.CustomExecution2);
  }

  $provideTask(handler: number, validTypes: Record<string, boolean>): Promise<TaskSetDTO> {
    const provider = this.taskHandlers.get(handler);
    if (!provider) {
      throw new Error(`taskprovider ${handler} not found`);
    }

    this.providedCustomExecutions.clear();
    this.providedCustomExecutions2.clear();

    const taskIdPromises: Promise<void>[] = [];
    const fetching = asPromise(() => provider.provider.provideTasks(CancellationToken.None))
      .then((result) => {
        const taskDTOs: TaskDTO[] = [];
        if (result) {
          for (const task of result) {
            if (!task.definition || !validTypes[task.definition.type]) {
              console.warn(false, `The task [${task.source}, ${task.name}] uses an undefined task type. The task will be ignored in the future.`);
            }
            const taskDTO: TaskDTO | undefined = TaskDTO.from(task, provider.extension);
            if (taskDTO) {
              taskDTOs.push(taskDTO);

              if (CustomExecutionDTO.is(taskDTO.execution)) {
                // The ID is calculated on the main thread task side, so, let's call into it here.
                // We need the task id's pre-computed for custom task executions because when OnDidStartTask
                // is invoked, we have to be able to map it back to our data.
                taskIdPromises.push(this.addCustomExecution(taskDTO, (task as vscode.Task2)));
              } else if (CustomExecution2DTO.is(taskDTO.execution)) {
                taskIdPromises.push(this.addCustomExecution2(taskDTO, (task as vscode.Task)));
              }
            }
          }
        }
        return {
          tasks: taskDTOs,
          extension: provider.extension,
        };
      });

    return new Promise((resolve) => {
      fetching.then((result) => {
        Promise.all(taskIdPromises).then(() => {
          resolve(result);
        });
      });
    });
  }

  async $resolveTask(handle: number, taskDTO: TaskDto): Promise<TaskDTO | undefined> {
    const taskDto = toTask(taskDTO);
    const handler = this.taskHandlers.get(handle);
    if (!handler) {
      return Promise.reject(new Error('no handler found!'));
    }

    const resolvedTask = await handler.provider.resolveTask(taskDto, CancellationToken.None);
    if (!resolvedTask) {
      return;
    }

    const resolvedTaskDTO: TaskDTO | undefined = TaskDTO.from(resolvedTask, handler.extension);
    if (!resolvedTaskDTO) {
      throw new Error('Unexpected: Task cannot be resolved.');
    }

    if (CustomExecutionDTO.is(resolvedTaskDTO.execution)) {
      await this.addCustomExecution(resolvedTaskDTO, resolvedTask as vscode.Task2);
    }

    if (CustomExecution2DTO.is(resolvedTaskDTO.execution)) {
      await this.addCustomExecution2(resolvedTaskDTO, resolvedTask as vscode.Task2);
    }
    return resolvedTaskDTO;
  }

}

export function createTaskApiFactory(
  rpcProtocol: IRPCProtocol,
  extensionService: IExtensionHostService,
  extHostTasks: IExtHostTasks,
  extension,
): typeof vscode.tasks {
  return {
    registerTaskProvider: (type: string, provider: TaskProvider) => {
      return extHostTasks.registerTaskProvider(type, provider, extension);
    },
    fetchTasks(filter?: TaskFilter): Promise<Task[]> {
      return extHostTasks.fetchTasks(filter);
    },
    executeTask: (task) => {
      return extHostTasks.executeTask(task, extension);
    },
    get taskExecutions(): ReadonlyArray<TaskExecution> {
      return extHostTasks.taskExecutions;
    },
    onDidStartTask: (listener, thisArg?, disposables?) => {
      return extHostTasks.onDidStartTask(listener, thisArg, disposables);
    },
    onDidEndTask(listener, thisArg?, disposables?) {
      return extHostTasks.onDidEndTask(listener, thisArg, disposables);
    },
    onDidStartTaskProcess(listener, thisArg?, disposables?) {
      return extHostTasks.onDidStartTaskProcess(listener, thisArg, disposables);
    },
    onDidEndTaskProcess(listener, thisArg?, disposables?) {
      return extHostTasks.onDidEndTaskProcess(listener, thisArg, disposables);
    },
  };
}
