/** A tiny hash router: the app has only a handful of screens. */
export type Route = "home" | "activities" | "changes" | "settings";

const ROUTES: Route[] = ["home", "activities", "changes", "settings"];

function parse(): Route {
  const name = location.hash.replace(/^#\/?/, "");
  return ROUTES.includes(name as Route) ? (name as Route) : "home";
}

class Router {
  route = $state<Route>(parse());

  constructor() {
    addEventListener("hashchange", () => {
      this.route = parse();
      scrollTo({ top: 0 });
    });
  }
}

export const router = new Router();

export const href = (route: Route) => (route === "home" ? "#/" : `#/${route}`);
