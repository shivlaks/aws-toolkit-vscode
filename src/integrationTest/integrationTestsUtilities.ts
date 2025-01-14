/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from 'assert'
import * as vscode from 'vscode'

export const EXTENSION_NAME_AWS_TOOLKIT = 'amazonwebservices.aws-toolkit-vscode'

const SECOND = 1000
export const TIMEOUT = 30 * SECOND

export async function activateExtension(extensionName: string): Promise<vscode.Extension<void>> {
    const extension: vscode.Extension<void> | undefined = vscode.extensions.getExtension(extensionName)
    assert.ok(extension)
    await extension!.activate()

    return extension as vscode.Extension<void>
}

export async function sleep(miliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, miliseconds))
}

// Retrieves CodeLenses from VS Code
export async function getCodeLenses(uri: vscode.Uri): Promise<vscode.CodeLens[] | undefined> {
    return vscode.commands.executeCommand('vscode.executeCodeLensProvider', uri)
}

// Retrieves CodeLenses and asserts that undefined is not returned.
// Convenience wrapper around the linter too.
export async function expectCodeLenses(uri: vscode.Uri): Promise<vscode.CodeLens[]> {
    const codeLenses = await getCodeLenses(uri)

    assert.ok(codeLenses, 'Did not expect undefined when requesting CodeLenses')

    return codeLenses! // appease the linter
}

export function getTestWorkspaceFolder(): string {
    assert.ok(vscode.workspace.workspaceFolders, 'Integration Tests expect a workspace folder to be loaded')
    assert.strictEqual(
        vscode.workspace.workspaceFolders!.length,
        1,
        'Integration Tests expect only one workspace folder to be loaded'
    )

    return vscode.workspace.workspaceFolders![0].uri.fsPath
}
