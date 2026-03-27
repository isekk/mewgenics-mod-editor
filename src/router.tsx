import { createHashRouter } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./features/home/HomePage";
import ModEditorPage from "./features/modEditor/ModEditorPage";

// const Blank = () => <div className="text-slate-400">Blank page</div>;
export const router = createHashRouter([{
    path: "/",
    element: <Layout />,
    children: [
        { index: true, element: <HomePage /> },
        { path: "mod-editor", element: <ModEditorPage /> },
    ]
}]);
