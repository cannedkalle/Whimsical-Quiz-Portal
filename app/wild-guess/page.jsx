import { getAppById } from "../../lib/apps";
import { pageTitle } from "../../lib/names";
import Game from './Game';
import './wild-guess.css';
import './tally.css';
import './reveal.css';
import './comparison.css';
import '../components/quiz-shell.css';

const app = getAppById("wild-guess");

export const metadata = {
  title: pageTitle(app.name),
  description: 'Which is bigger? Pick between two surprising possibilities and discover the scale of our world.',
};
export default function Page(){return <Game/>;}
