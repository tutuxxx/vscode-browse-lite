import EventEmitterEnhancer, { EnhancedEventEmitter } from 'event-emitter-enhancer'
import { Browser, CDPSession, Page } from 'puppeteer-core'
import { Clipboard } from './Clipboard'

export class BrowserPage extends EnhancedEventEmitter {
  private client: CDPSession
  private clipboard: Clipboard

  constructor(
    public readonly browser: Browser,
    public readonly page: Page,
  ) {
    super()
    this.clipboard = new Clipboard()
  }

  get id(): string {
    // @ts-expect-error
    return this.page.mainFrame()._id
  }

  public dispose() {
    this.removeAllElseListeners()
    // @ts-expect-error
    this.removeAllListeners()
    this.client.detach()
    this.page.close()
  }

  public async send(action: string, data: object = {}, callbackId?: number) {
    // console.log('► browserPage.send', action)
    switch (action) {
      case 'Page.goForward':
        await this.page.goForward()
        break
      case 'Page.goBackward':
        await this.page.goBack()
        break
      case 'Clipboard.readText':
        try {
          this.emit({
            callbackId,
            result: await this.clipboard.readText(),
          } as any)
        }
        catch (e) {
          this.emit({
            callbackId,
            error: e.message,
          } as any)
        }
        break
      default:
        this.client
          .send(action, data)
          .then((result: any) => {
            this.emit({
              callbackId,
              result,
            } as any)
          })
          .catch((err: any) => {
            this.emit({
              callbackId,
              error: err.message,
            } as any)
          })
    }
  }

  public async launch(): Promise<void> {
    this.client = await this.page.target().createCDPSession()

    // @ts-expect-error
    EventEmitterEnhancer.modifyInstance(this.client)

    // @ts-expect-error
    this.client.else((action: string, data: object) => {
      // console.log('◀ browserPage.received', action)
      this.emit({
        method: action,
        result: data,
      } as any)
    })
  }
}
