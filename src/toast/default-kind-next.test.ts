/**
 * @vitest-environment jsdom
 *
 * The default kind on Sonner 2.0.8, installed beside the pinned one as
 * `sonner-next`. Every import of "sonner" under this file gets it, the
 * <Toaster>'s own included.
 */
import { vi } from "vitest";
import { defaultKindSuite } from "../../test/default-kind-suite.js";

vi.mock("sonner", async () => await vi.importActual<typeof import("sonner-next")>("sonner-next"));

defaultKindSuite("2.0.8");
