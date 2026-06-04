/**
 * django-grid-view — single browser bundle entry.
 * Source modules live in frontend/src/grid-view/ — rebuild with `npm run build --prefix frontend`.
 */
import { bootstrapGridView } from "./grid-view/create-grid-view";

bootstrapGridView();
