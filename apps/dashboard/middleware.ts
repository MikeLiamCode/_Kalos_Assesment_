import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {},
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        if (pathname.startsWith("/dashboard")) {
          return !!token && token.role === "MEMBER";
        }

        if (pathname.startsWith("/membergpt")) {
          return !!token && token.role === "COACH";
        }

        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/membergpt/:path*"],
};