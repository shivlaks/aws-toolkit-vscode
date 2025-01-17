/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from 'assert'
import * as del from 'del'
import * as path from 'path'
import * as filesystemUtilities from '../../../shared/filesystemUtilities'
import { WinstonToolkitLogger } from '../../../shared/logger/winstonToolkitLogger'
import { MockOutputChannel } from '../../mockOutputChannel'
import { assertThrowsError } from '../utilities/assertUtils'

describe('WinstonToolkitLogger', () => {
    let tempFolder: string

    before(async () => {
        tempFolder = await filesystemUtilities.makeTemporaryToolkitFolder()
    })

    after(async () => {
        if (await filesystemUtilities.fileExists(tempFolder)) {
            await del(tempFolder, { force: true })
        }
    })

    it('creates an object', () => {
        assert.notStrictEqual(new WinstonToolkitLogger('info'), undefined)
    })

    it('throws when logging to a disposed object', async () => {
        const logger = new WinstonToolkitLogger('info')
        logger.dispose()

        await assertThrowsError(async () => logger.info('This should not log'))
    })

    const happyLogScenarios = [
        {
            name: 'logs debug',
            logMessage: (logger: WinstonToolkitLogger, message: string) => {
                logger.debug(message)
            }
        },
        {
            name: 'logs verbose',
            logMessage: (logger: WinstonToolkitLogger, message: string) => {
                logger.verbose(message)
            }
        },
        {
            name: 'logs info',
            logMessage: (logger: WinstonToolkitLogger, message: string) => {
                logger.info(message)
            }
        },
        {
            name: 'logs warn',
            logMessage: (logger: WinstonToolkitLogger, message: string) => {
                logger.warn(message)
            }
        },
        {
            name: 'logs error',
            logMessage: (logger: WinstonToolkitLogger, message: string) => {
                logger.error(message)
            }
        }
    ]

    describe('logs to a file', async () => {
        let tempLogPath: string
        let tempFileCounter = 0
        let testLogger: WinstonToolkitLogger | undefined

        beforeEach(async () => {
            tempLogPath = path.join(tempFolder, `temp-${++tempFileCounter}.log`)
        })

        afterEach(async () => {
            if (testLogger) {
                testLogger.dispose()
                testLogger = undefined
            }
        })

        it('does not log a lower level', async () => {
            const debugMessage = 'debug message'
            const errorMessage = 'error message'

            testLogger = new WinstonToolkitLogger('error')
            testLogger.logToFile(tempLogPath)

            testLogger.debug(debugMessage)
            testLogger.error(errorMessage)

            assert.ok(await isTextInLogFile(tempLogPath, errorMessage), 'Expected error message to be logged')
            assert.strictEqual(
                await isTextInLogFile(tempLogPath, debugMessage),
                false,
                'Unexpected debug message was logged'
            )
        })

        it('logs multiple inputs', async () => {
            testLogger = new WinstonToolkitLogger('info')
            testLogger.logToFile(tempLogPath)

            testLogger.info('The', 'quick', 'brown', 'fox')

            assert.ok(await isTextInLogFile(tempLogPath, 'The quick brown fox'), 'Expected error message to be logged')
        })

        happyLogScenarios.forEach(scenario => {
            it(scenario.name, async () => {
                const message = `message for ${scenario.name}`
                testLogger = new WinstonToolkitLogger('debug')
                testLogger.logToFile(tempLogPath)

                scenario.logMessage(testLogger, message)

                assert.ok(await isTextInLogFile(tempLogPath, message), 'Expected log message was missing')
            })
        })

        async function isTextInLogFile(logPath: string, text: string): Promise<boolean> {
            await waitForLogFile(logPath)
            const logText = await filesystemUtilities.readFileAsString(logPath)

            return logText.includes(text)
        }

        async function waitForLogFile(logPath: string): Promise<void> {
            const timeoutPromise = new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    clearTimeout(timeout)
                    reject('Log file not found in 1500 ms')
                }, 1500)
            })

            const fileExistsPromise = new Promise<void>(async (resolve, reject) => {
                while (true) {
                    if (await filesystemUtilities.fileExists(logPath)) {
                        resolve()
                    }
                }
            })

            return Promise.race([timeoutPromise, fileExistsPromise])
        }
    })

    describe('logs to an OutputChannel', async () => {
        let testLogger: WinstonToolkitLogger | undefined
        let outputChannel: MockOutputChannel

        beforeEach(async () => {
            outputChannel = new MockOutputChannel()
        })

        afterEach(async () => {
            if (testLogger) {
                testLogger.dispose()
                testLogger = undefined
            }
        })

        it('does not log a lower level', async () => {
            const debugMessage = 'debug message'
            const errorMessage = 'error message'

            testLogger = new WinstonToolkitLogger('error')
            testLogger.logToOutputChannel(outputChannel)

            const waitForMessage = waitForLoggedTextByCount(1)

            testLogger.debug(debugMessage)
            testLogger.error(errorMessage)

            assert.ok((await waitForMessage).includes(errorMessage), 'Expected error message to be logged')
        })

        it('logs multiple inputs', async () => {
            testLogger = new WinstonToolkitLogger('info')
            testLogger.logToOutputChannel(outputChannel)
            const expectedText = 'The quick brown fox'

            const waitForMessage = waitForLoggedTextByContents(expectedText)

            testLogger.info('The', 'quick', 'brown', 'fox')

            assert.ok((await waitForMessage).includes('The quick brown fox'), 'Expected error message to be logged')
        })

        happyLogScenarios.forEach(scenario => {
            it(scenario.name, async () => {
                const message = `message for ${scenario.name}`
                testLogger = new WinstonToolkitLogger('debug')
                testLogger.logToOutputChannel(outputChannel)

                const waitForMessage = waitForLoggedTextByCount(1)

                scenario.logMessage(testLogger, message)

                assert.ok((await waitForMessage).includes(message), 'Expected error message to be logged')
            })
        })

        // Logger writes to OutputChannel in async manner.
        async function waitForLoggedTextByCount(entries: number): Promise<string> {
            return new Promise<string>((resolve, reject) => {
                let loggedEntries = 0
                let loggedText = ''

                const appendTextEvent = outputChannel.onDidAppendText(text => {
                    loggedText += text
                    loggedEntries++

                    if (loggedEntries >= entries) {
                        appendTextEvent.dispose()
                        resolve(loggedText)
                    }
                })
            })
        }

        // Logger writes to OutputChannel in async manner.
        async function waitForLoggedTextByContents(expectedText: string): Promise<string> {
            return new Promise<string>((resolve, reject) => {
                let loggedText = ''

                const appendTextEvent = outputChannel.onDidAppendText(text => {
                    loggedText += text

                    if (text.includes(expectedText)) {
                        appendTextEvent.dispose()
                        resolve(loggedText)
                    }
                })
            })
        }
    })
})
