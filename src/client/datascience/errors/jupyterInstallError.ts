// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { BaseError } from '../../common/errors/types';
import '../../common/extensions';

export class JupyterInstallError extends BaseError {
    constructor(message: string) {
        super('jupyterinstall', message);
    }
}
