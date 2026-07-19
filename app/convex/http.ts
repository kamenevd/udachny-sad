import { httpRouter } from "convex/server";
import { auth } from "./auth";

// HTTP-маршруты Convex Auth (обязательны для работы провайдеров)
const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
