import { getAppById } from "../../lib/apps";
import { pageTitle, SITE_NAME } from "../../lib/names";
import Game from "./Game";
import "./spin-draw.css";

const app = getAppById("spin-draw");

export const metadata = {
  title: pageTitle(app.name),
  description: "Play " + app.name + " from " + SITE_NAME + ".",
};

export default function SpinDrawPage() {
  return <Game />;
}
