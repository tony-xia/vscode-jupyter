// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

export enum EventName {
    EXTENSION_LOAD = 'EXTENSION.LOAD',
    PYTHON_INTERPRETER_ACTIVATION_ENVIRONMENT_VARIABLES = 'PYTHON_INTERPRETER_ACTIVATION_ENVIRONMENT_VARIABLES',
    ENVFILE_VARIABLE_SUBSTITUTION = 'ENVFILE_VARIABLE_SUBSTITUTION',
    ENVFILE_WORKSPACE = 'ENVFILE_WORKSPACE',
    JUPYTER_EXPERIMENTS_OPT_IN_OUT = 'JUPYTER_EXPERIMENTS_OPT_IN_OUT',
    PLATFORM_INFO = 'PLATFORM.INFO',
    HASHED_PACKAGE_NAME = 'HASHED_PACKAGE_NAME',
    HASHED_PACKAGE_PERF = 'HASHED_PACKAGE_PERF',

    OPEN_DATAVIEWER_FROM_VARIABLE_WINDOW_REQUEST = 'OPEN_DATAVIEWER_FROM_VARIABLE_WINDOW_REQUEST_EX',
    OPEN_DATAVIEWER_FROM_VARIABLE_WINDOW_ERROR = 'OPEN_DATAVIEWER_FROM_VARIABLE_WINDOW_ERROR_EX',
    OPEN_DATAVIEWER_FROM_VARIABLE_WINDOW_SUCCESS = 'OPEN_DATAVIEWER_FROM_VARIABLE_WINDOW_SUCCESS_EX'
}

export enum PlatformErrors {
    FailedToParseVersion = 'FailedToParseVersion',
    FailedToDetermineOS = 'FailedToDetermineOS'
}
