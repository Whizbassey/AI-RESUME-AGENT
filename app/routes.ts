import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/auth', 'routes/auth.tsx'),
    route('/upload', 'routes/upload.tsx'),
    route('/resume/:id', 'routes/resume.tsx'),
    route('/wipe', 'routes/wipe.tsx'),
    route('/enhance/:id', 'routes/enhance.tsx'),
    route('/createresume', 'routes/createresume.tsx'),
    route('/enhanced/:id', 'routes/enhancedresume.tsx'),
    route('/tailor', 'routes/tailor.tsx'),
    route('/chat-enhance/:id', 'routes/chat-enhance.tsx'),
] satisfies RouteConfig;
