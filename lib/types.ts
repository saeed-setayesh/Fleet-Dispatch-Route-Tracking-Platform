export type UserRole = "dispatcher" | "driver" | "customer";

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case "dispatcher":
      return "/dispatcher";
    case "driver":
      return "/driver";
    case "customer":
      return "/customer";
    default:
      return "/login";
  }
}
