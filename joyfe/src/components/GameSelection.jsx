import { Link } from 'react-router-dom';
import '../styles/GameSelection.css';

export function GameSelection() {
  return (
    <div className="selection-container">
      <h2 className="selection-title">Choose Your Game</h2>
      
      <div className="games-grid">
        {/* Boggle with Letter Tiles */}
        <div className="game-holder">
          <div className="visual boggle-visual">
            <div className="letter-tiles">
              <span className="tile">W</span>
              <span className="tile">O</span>
              <span className="tile">R</span>
              <span className="tile">D</span>
            </div>
          </div>
          <Link to="/boggle" className="game-card boggle-card">
            <h3>Boggle Word Hunt</h3>
            <p>Find hidden words in the letter grid!</p>
          </Link>
        </div>

        {/* Fruit Guesser with Panda */}
        <div className="game-holder">
          <div className="visual panda-visual">
            <div className="head">
              <div className="ears">
                <div className="ear left"></div>
                <div className="ear right"></div>
              </div>
              <div className="face">
                <div className="eyes"></div>
                <div className="nose"></div>
              </div>
            </div>
            <div className="arms">
              <div className="arm left">
                <div className="banana"></div>
              </div>
              <div className="arm right"></div>
            </div>
          </div>
          <Link to="/fruit-guesser" className="game-card fruit-card">
            <h3>Fruit Guesser</h3>
            <p>Identify fruits and vegetables!</p>
          </Link>
        </div>

        {/* Memory Game with Color-Changing Block */}
        <div className="game-holder">
          <div className="visual memory-visual">
            <div className="color-block"></div>
          </div>
          <Link to="/memory-game" className="game-card memory-card">
            <h3>Memory Game</h3>
            <p>Match colorful pairs to win!</p>
          </Link>
        </div>

        {/* Memory Sequence Game with Shuffling Cups */}
        <div className="game-holder">
          <div className="visual sequence-visual">
            <div className="dots">
              <span className="cup red"></span>
              <span className="cup blue"></span>
              <span className="cup green"></span>
              <span className="cup yellow"></span>
            </div>
          </div>
          <Link to="/memory-sequence" className="game-card sequence-card">
            <h3>Memory Sequence Game</h3>
            <p>Repeat the color sequence!</p>
          </Link>
        </div>
      </div>
    </div>
  );
}