/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * Responsible for running the "unit" tests
 */

import { runTests } from './testRunner'

export async function run(): Promise<void> {
    await runTests({
        rootTestsPath: __dirname
    })
}
