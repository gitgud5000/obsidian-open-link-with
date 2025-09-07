import { ItemView, PaneType, WorkspaceLeaf } from 'obsidian'
import { BuiltinIcon } from './obsidian/types'
import { OpenLinkPluginITF, ViewMode, ViewRec } from './types'
import { log } from './utils'

class InAppView extends ItemView {
    public icon: BuiltinIcon = 'link'
    public frame: HTMLIFrameElement
    public title: string
    constructor(leaf: WorkspaceLeaf, public url: string) {
        super(leaf)
        this.title = new URL(url).host
        // TODO: remove this after tab title issue is fixed
        this.leaf.setPinned(true)
        setTimeout(() => {
            this.leaf.setPinned(false)
        }, 10)
    }
    async onOpen(): Promise<void> {
        const frame_styles: string[] = [
            'height: 100%',
            'width: 100%',
            'background-color: white', // for pages with no background
        ]
        this.frame = document.createElement('iframe')
        this.frame.setAttr('style', frame_styles.join('; '))
        this.frame.setAttr('src', this.url)
        this.containerEl.children[1].appendChild(this.frame)
    }
    getDisplayText(): string {
        return this.title
    }
    getViewType(): string {
        return 'OOLW::InAppView'
    }
}

class WebViewerView extends ItemView {
    public icon: BuiltinIcon = 'popup-open'
    public title: string
    constructor(leaf: WorkspaceLeaf, public url: string) {
        super(leaf)
        this.title = new URL(url).host
        // TODO: remove this after tab title issue is fixed
        this.leaf.setPinned(true)
        setTimeout(() => {
            this.leaf.setPinned(false)
        }, 10)
    }
    async onOpen(): Promise<void> {
        // Try to use Obsidian's built-in web viewer if available (1.9+)
        try {
            // Check if the browser view type is available in Obsidian 1.9+
            const app = this.app as any
            if (app.viewRegistry && app.viewRegistry.viewByType && 
                app.viewRegistry.viewByType['browser']) {
                // Use the built-in browser view if available
                const browserLeaf = this.app.workspace.getLeaf('tab')
                await browserLeaf.setViewState({
                    type: 'browser',
                    state: { url: this.url }
                })
                
                // If successful, switch to that leaf and close this one
                this.app.workspace.setActiveLeaf(browserLeaf)
                this.leaf.detach()
                return
            }
        } catch (error) {
            // Safely check for logging settings
            try {
                const app = this.app as any
                if (app.plugins?.plugins?.['open-link-with']?.settings?.enableLog) {
                    log('info', 'Built-in browser view not available, using enhanced iframe fallback', error)
                }
            } catch (logError) {
                // Ignore logging errors
            }
        }
        
        // Enhanced iframe fallback with better browser-like features
        const frame_styles: string[] = [
            'height: 100%',
            'width: 100%',
            'background-color: white',
            'border: none',
        ]
        const frame = document.createElement('iframe')
        frame.setAttr('style', frame_styles.join('; '))
        frame.setAttr('src', this.url)
        // Enhanced security and features for web viewer
        frame.setAttr('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-top-navigation')
        frame.setAttr('allow', 'fullscreen; autoplay; encrypted-media')
        this.containerEl.children[1].appendChild(frame)
    }
    getDisplayText(): string {
        return this.title
    }
    getViewType(): string {
        return 'OOLW::WebViewerView'
    }
}

class ViewMgr {
    constructor(public plugin: OpenLinkPluginITF) {}
    private _getLeafId(leaf: any): string {
        return leaf['id'] ?? ''
    }
    private _validRecords(): ViewRec[] {
        const records = this.plugin.settings.inAppViewRec ?? []
        const validRec: ViewRec[] = []
        try {
            for (const rec of records) {
                if (
                    this.plugin.app.workspace.getLeafById(rec.leafId) !== null
                ) {
                    validRec.push(rec)
                }
            }
        } catch (err) {
            if (this.plugin.settings.enableLog) {
                log('error', 'failed to restore views', `${err}`)
            }
        }
        return validRec
    }
    async createView(
        url: string,
        mode: ViewMode,
        options: {
            focus?: boolean
            paneType?: PaneType
            useWebViewer?: boolean
        } = {}
    ): Promise<string> {
        const getNewLeafId = (): string => {
            const newLeaf =
                typeof options.paneType === 'undefined'
                    ? false
                    : options.paneType
            const leaf = this.plugin.app.workspace.getLeaf(
                newLeaf === false ? 'tab' : newLeaf // TODO: missing navigation; using tab for now
            )
            return this._getLeafId(leaf)
        }
        let id: string = undefined
        // TODO: more robust open behaviors
        if (typeof options.paneType !== 'undefined' || mode === ViewMode.NEW) {
            id = getNewLeafId()
        } else {
            const viewRec = this._validRecords()
            let rec =
                viewRec.find(({ mode }) => mode === ViewMode.LAST) ??
                viewRec.find(({ mode }) => mode === ViewMode.NEW)
            id = rec?.leafId ?? getNewLeafId()
        }
        return await this.updateView(id, url, mode, options?.focus, options?.useWebViewer)
    }
    async updateView(
        leafId: string,
        url: string,
        mode: ViewMode,
        focus: boolean = true,
        useWebViewer: boolean = false
    ): Promise<string | null> {
        const leaf = this.plugin.app.workspace.getLeafById(leafId)
        if (leaf === null) {
            return null
        } else {
            const view = useWebViewer ? new WebViewerView(leaf, url) : new InAppView(leaf, url)
            await leaf.open(view)
            const rec = this.plugin.settings.inAppViewRec.find(
                (rec) => rec.leafId === leafId
            )
            if (typeof rec !== 'undefined') {
                rec.url = url
                // TODO:
                rec.mode = rec.mode ?? mode
            } else {
                this.plugin.settings.inAppViewRec.unshift({
                    leafId,
                    url,
                    mode,
                })
            }
            await this.plugin.saveSettings()
            // this.plugin.app.workspace.setActiveLeaf(leaf, { focus }) // TODO: option `focus` is not working (cliVer == 1.1.9)
            if (focus) {
                this.plugin.app.workspace.setActiveLeaf(leaf)
            }
            return leafId
        }
    }
    async createWebViewerView(
        url: string,
        mode: ViewMode,
        options: {
            focus?: boolean
            paneType?: PaneType
        } = {}
    ): Promise<string> {
        return await this.createView(url, mode, { ...options, useWebViewer: true })
    }
    async restoreView() {
        const viewRec = this._validRecords()
        const restored: ViewRec[] = []
        for (const rec of viewRec) {
            if (
                (await this.updateView(
                    rec.leafId,
                    rec.url,
                    rec.mode,
                    false
                )) !== null
            ) {
                restored.push(rec)
            }
        }
        this.plugin.settings.inAppViewRec = restored
        await this.plugin.saveSettings()
    }
}

export { InAppView, WebViewerView, ViewMgr, ViewMode, ViewRec }
