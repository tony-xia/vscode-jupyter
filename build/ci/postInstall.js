// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

const { EOL } = require('os');
const colors = require('colors/safe');
const fs = require('fs-extra');
const path = require('path');
const constants = require('../constants');
const child_process = require('child_process');

/**
 * In order to get raw kernels working, we reuse the default kernel that jupyterlab ships.
 * However it expects to be talking to a websocket which is serializing the messages to strings.
 * Our raw kernel is not a web socket and needs to do its own serialization. To do so, we make a copy
 * of the default kernel with the serialization stripped out. This is simpler than making a copy of the module
 * at runtime.
 */
function createJupyterKernelWithoutSerialization() {
    var relativePath = path.join('node_modules', '@jupyterlab', 'services', 'lib', 'kernel', 'default.js');
    var filePath = path.join(constants.ExtensionRootDir, relativePath);
    if (!fs.existsSync(filePath)) {
        throw new Error(
            "Jupyter lab default kernel not found '" + filePath + "' (Jupyter Extension post install script)"
        );
    }
    var fileContents = fs.readFileSync(filePath, { encoding: 'utf8' });
    var replacedContents = fileContents.replace(
        /^const serialize =.*$/gm,
        'const serialize = { serialize: (a) => a, deserialize: (a) => a };'
    );
    if (replacedContents === fileContents) {
        throw new Error('Jupyter lab default kernel cannot be made non serializing');
    }
    var destPath = path.join(path.dirname(filePath), 'nonSerializingKernel.js');
    fs.writeFileSync(destPath, replacedContents);
    console.log(colors.green(destPath + ' file generated (by Jupyter VSC)'));
}

/**
 * Fix compilation issues in jsdom files.
 */
function updateJSDomTypeDefinition() {
    var relativePath = path.join('node_modules', '@types', 'jsdom', 'base.d.ts');
    var filePath = path.join(constants.ExtensionRootDir, relativePath);
    if (!fs.existsSync(filePath)) {
        console.warn("JSdom base.d.ts not found '" + filePath + "' (Jupyter Extension post install script)");
        return;
    }
    var fileContents = fs.readFileSync(filePath, { encoding: 'utf8' });
    var replacedContents = fileContents.replace(
        /\s*globalThis: DOMWindow;\s*readonly \["Infinity"]: number;\s*readonly \["NaN"]: number;/g,
        [
            'globalThis: DOMWindow;',
            '// @ts-ignore',
            'readonly ["Infinity"]: number;',
            '// @ts-ignore',
            'readonly ["NaN"]: number;'
        ].join(`${EOL}        `)
    );
    if (replacedContents === fileContents) {
        console.warn('JSdom base.d.ts not updated');
        return;
    }
    fs.writeFileSync(filePath, replacedContents);
}

/**
 * The Variable Explorer currently uses react-data-grid@6.1.0 and is the only component that does.
 * We retrieve variable names sorted so there will never be a time where variables are unsorted.
 * react-data-grid is on v7+ now and a PR to implement this would cause a lot of cascading changes for us,
 * so we modify the compiled javascript so that the react-data-grid is always sorted by something.
 */
function makeVariableExplorerAlwaysSorted() {
    const fileNames = ['react-data-grid.js', 'react-data-grid.min.js'];
    const alwaysSortedCode = 'case g.NONE:e=r?g.DESC:g.ASC;break;case g.ASC:e=g.DESC;break;case g.DESC:e=g.ASC';
    const originalCode =
        'case g.NONE:e=r?g.DESC:g.ASC;break;case g.ASC:e=r?g.NONE:g.DESC;break;case g.DESC:e=r?g.ASC:g.NONE';
    for (const fileName of fileNames) {
        var relativePath = path.join('node_modules', 'react-data-grid', 'dist', fileName);
        var filePath = path.join(constants.ExtensionRootDir, relativePath);
        if (!fs.existsSync(filePath)) {
            throw new Error("react-data-grid dist file not found '" + filePath + "' (pvsc post install script)");
        }
        var fileContents = fs.readFileSync(filePath, { encoding: 'utf8' });
        if (fileContents.indexOf(alwaysSortedCode) > 0) {
            // tslint:disable-next-line:no-console
            console.log(colors.blue(relativePath + ' file already updated (by Jupyter VSC)'));
            return;
        }
        if (fileContents.indexOf(originalCode) > 0) {
            var replacedText = fileContents.replace(originalCode, alwaysSortedCode);
            if (fileContents === replacedText) {
                throw new Error(`Fix for react-data-grid file ${fileName} failed (pvsc post install script)`);
            }
            fs.writeFileSync(filePath, replacedText);
            // tslint:disable-next-line:no-console
            console.log(colors.green(relativePath + ' file updated (by Jupyter VSC)'));
        } else {
            // tslint:disable-next-line:no-console
            console.log(colors.red(relativePath + ' file does not need updating.'));
        }
    }
}

function addLoggingForCI() {
    const filePath = path.join(constants.ExtensionRootDir, 'node_modules/@jupyterlab/services/lib/kernel/default.js');
    let fileContents = fs.readFileSync(filePath, { encoding: 'utf8' });
    fileContents.replace(
        '        if (this._connectionStatus === connectionStatus) {',
        '        ' +
            '\nconsole.log("Connection Status " + connectionStatus);\n' +
            '        if (this._connectionStatus === connectionStatus) {'
    );
    fileContents.replace(
        '        Private.logKernelStatus(this);',
        '        ' +
            '\nconsole.log("kernel Status updated to " + this.status);\n' +
            '        Private.logKernelStatus(this);'
    );
    fileContents.replace(
        '            reply = (await Private.handleShellMessage(this, msg));',
        '        ' +
            '\nconsole.log("Sending request to get kernel info");\n' +
            '            reply = (await Private.handleShellMessage(this, msg));' +
            '\nconsole.log("Got response for kernel info", JSON.stringify(reply));\n'
    );
    fileContents.replace(
        '            // If we rejected because the future was disposed, ignore and return.',
        '        ' +
            '\nconsole.error("Error in to get kernel info", e);\n' +
            '            // If we rejected because the future was disposed, ignore and return.'
    );
    fileContents.replace(
        '            this._kernelSession = msg.header.session;',
        '        ' +
            '\nconsole.log("Got Kernel message", JSON.stringify(msg));\n' +
            '            this._kernelSession = msg.header.session;'
    );
    fileContents.replace(
        "            if (this.connectionStatus === 'connected') {",
        '        ' +
            '\nconsole.log("Sending kernel info message in _sendMessage");\n' +
            "            if (this.connectionStatus === 'connected') {"
    );
    fileContents.replace(
        '        if (queue && this._pendingMessages.length > 0) {',
        '        ' +
            '\nconsole.log("Queue message into pending messages");\n' +
            '        if (queue && this._pendingMessages.length > 0) {'
    );
    fileContents.replace(
        '            this._kernelSession !== RESTARTING_KERNEL_SESSION) {',
        '            this._kernelSession !== RESTARTING_KERNEL_SESSION) {' +
            '        ' +
            '\nconsole.log("Send message as connection has been established");\n'
    );
    fileContents.replace(
        '        else if (queue) {',
        '        else if (queue) {' +
            '        ' +
            '\nconsole.log("QUeue message as connection has NOT been established");\n'
    );
    fileContents.replace(
        '            this._sendMessage(this._pendingMessages[0], false);',
        '        ' +
            '\nconsole.log("EMpty queue and send one by one");\n' +
            '            this._sendMessage(this._pendingMessages[0], false);'
    );
}

makeVariableExplorerAlwaysSorted();
createJupyterKernelWithoutSerialization();
updateJSDomTypeDefinition();
