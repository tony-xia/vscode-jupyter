// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ChildProcess, ExecOptions, SpawnOptions as ChildProcessSpawnOptions } from 'child_process';
import { Observable } from 'rxjs/Observable';
import { CancellationToken, Uri } from 'vscode';

import { Newable } from '../../ioc/types';
import { PythonExecInfo } from '../../pythonEnvironments/exec';
import { InterpreterInformation, PythonEnvironment } from '../../pythonEnvironments/info';
import { BaseError } from '../errors/types';
import { IDisposable } from '../types';
import { EnvironmentVariables } from '../variables/types';

export const IBufferDecoder = Symbol('IBufferDecoder');
export interface IBufferDecoder {
    decode(buffers: Buffer[], encoding: string): string;
}

export type Output<T extends string | Buffer> = {
    source: 'stdout' | 'stderr';
    out: T;
};
export type ObservableExecutionResult<T extends string | Buffer> = {
    proc: ChildProcess | undefined;
    out: Observable<Output<T>>;
    dispose(): void;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export type SpawnOptions = ChildProcessSpawnOptions & {
    encoding?: string;
    token?: CancellationToken;
    mergeStdOutErr?: boolean;
    throwOnStdErr?: boolean;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export type ShellOptions = ExecOptions & { throwOnStdErr?: boolean; token?: CancellationToken };

export type ExecutionResult<T extends string | Buffer> = {
    stdout: T;
    stderr?: T;
};

export const IProcessLogger = Symbol('IProcessLogger');
export interface IProcessLogger {
    logProcess(file: string, ars: string[], options?: SpawnOptions): void;
}

export interface IProcessService extends IDisposable {
    execObservable(file: string, args: string[], options?: SpawnOptions): ObservableExecutionResult<string>;
    exec(file: string, args: string[], options?: SpawnOptions): Promise<ExecutionResult<string>>;
    shellExec(command: string, options?: ShellOptions): Promise<ExecutionResult<string>>;
    on(event: 'exec', listener: (file: string, args: string[], options?: SpawnOptions) => void): this;
}

export const IProcessServiceFactory = Symbol('IProcessServiceFactory');

export interface IProcessServiceFactory {
    create(resource?: Uri): Promise<IProcessService>;
}

export const IPythonExecutionFactory = Symbol('IPythonExecutionFactory');
export type ExecutionFactoryCreationOptions = {
    resource?: Uri;
    interpreter: PythonEnvironment;
};
export function isDaemonPoolCreationOption(
    options: PooledDaemonExecutionFactoryCreationOptions | DedicatedDaemonExecutionFactoryCreationOptions
): options is PooledDaemonExecutionFactoryCreationOptions {
    if ('dedicated' in options && options.dedicated === true) {
        return false;
    } else {
        return true;
    }
}

// This daemon will belong to a daemon pool (i.e it goes back into a pool for re-use).
export type PooledDaemonExecutionFactoryCreationOptions = ExecutionFactoryCreationOptions & {
    /**
     * Python file that implements the daemon.
     *
     * @type {string}
     */
    daemonModule?: string;
    /**
     * Typescript Daemon class (client) that maps to the Python daemon.
     * Defaults to `PythonDaemonExecutionService`.
     * Any other class provided must extend `PythonDaemonExecutionService`.
     *
     * @type {Newable<IPythonDaemonExecutionService>}
     */
    daemonClass?: Newable<IPythonDaemonExecutionService>;
    /**
     * Number of daemons to be created for standard synchronous operations such as
     * checking if a module is installed, running a module, running a python file, etc.
     * Defaults to `2`.
     *
     */
    daemonCount?: number;
    /**
     * Number of daemons to be created for operations such as execObservable, execModuleObservale.
     * These operations are considered to be long running compared to checking if a module is installed.
     * Hence a separate daemon will be created for this.
     * Defaults to `1`.
     *
     */
    observableDaemonCount?: number;
};
// This daemon will not belong to a daemon pool (i.e its a dedicated daemon and cannot be re-used).
export type DedicatedDaemonExecutionFactoryCreationOptions = ExecutionFactoryCreationOptions & {
    /**
     * Python file that implements the daemon.
     */
    daemonModule?: string;
    /**
     * Typescript Daemon class (client) that maps to the Python daemon.
     * Defaults to `PythonDaemonExecutionService`.
     * Any other class provided must extend `PythonDaemonExecutionService`.
     */
    daemonClass?: Newable<IPythonDaemonExecutionService | IDisposable>;
    /**
     * This flag indicates it is a dedicated daemon.
     */
    dedicated: true;
};
export type DaemonExecutionFactoryCreationOptions =
    | PooledDaemonExecutionFactoryCreationOptions
    | DedicatedDaemonExecutionFactoryCreationOptions;
export type ExecutionFactoryCreateWithEnvironmentOptions = {
    resource?: Uri;
    interpreter: PythonEnvironment;
    allowEnvironmentFetchExceptions?: boolean;
};
export interface IPythonExecutionFactory {
    create(options: ExecutionFactoryCreationOptions): Promise<IPythonExecutionService>;
    /**
     * Creates a daemon Python Process.
     * On windows it's cheaper to create a daemon and use that than spin up Python Processes everytime.
     * If something cannot be executed within the daemon, it will resort to using the standard IPythonExecutionService.
     * Note: The returned execution service is always using an activated environment.
     *
     * @param {ExecutionFactoryCreationOptions} options
     * @returns {(Promise<IPythonDaemonExecutionService>)}
     * @memberof IPythonExecutionFactory
     */
    createDaemon<T extends IPythonDaemonExecutionService | IDisposable>(
        options: DaemonExecutionFactoryCreationOptions
    ): Promise<T | IPythonExecutionService>;
    createActivatedEnvironment(options: ExecutionFactoryCreateWithEnvironmentOptions): Promise<IPythonExecutionService>;
}
export const IPythonExecutionService = Symbol('IPythonExecutionService');

export interface IPythonExecutionService {
    getInterpreterInformation(): Promise<InterpreterInformation | undefined>;
    getExecutablePath(): Promise<string>;
    isModuleInstalled(moduleName: string): Promise<boolean>;
    getExecutionInfo(pythonArgs?: string[]): PythonExecInfo;

    execObservable(args: string[], options: SpawnOptions): ObservableExecutionResult<string>;
    execModuleObservable(moduleName: string, args: string[], options: SpawnOptions): ObservableExecutionResult<string>;

    exec(args: string[], options: SpawnOptions): Promise<ExecutionResult<string>>;
    execModule(moduleName: string, args: string[], options: SpawnOptions): Promise<ExecutionResult<string>>;
}

/**
 * Identical to the PythonExecutionService, but with a `dispose` method.
 * This is a daemon process that lives on until it is disposed, hence the `IDisposable`.
 *
 * @export
 * @interface IPythonDaemonExecutionService
 * @extends {IPythonExecutionService}
 * @extends {IDisposable}
 */
export interface IPythonDaemonExecutionService extends IPythonExecutionService, IDisposable {}

export class StdErrError extends BaseError {
    constructor(message: string) {
        super('unknown', message);
    }
}

export interface IExecutionEnvironmentVariablesService {
    getEnvironmentVariables(resource?: Uri): Promise<EnvironmentVariables | undefined>;
}
