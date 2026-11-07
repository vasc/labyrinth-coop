import { GlobalRegistrator } from "@happy-dom/global-registrator";

// The site's rendering tests need a DOM; the simulator tests don't mind it being there.
// Tests never fetch the page's web fonts, so a stylesheet link counts as loaded instead of logging an error.
GlobalRegistrator.register({ settings: { handleDisabledFileLoadingAsSuccess: true } });
