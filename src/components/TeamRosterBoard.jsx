import { UsersRound } from "lucide-react";
import PlayerImage from "./PlayerImage";

export default function TeamRosterBoard({ teams = [], ownTeamId }) {
  return (
    <section className="card roster-board">
      <div className="section-heading roster-heading">
        <div>
          <span className="eyebrow">THE LEAGUE ROOM</span>
          <h2>
            <UsersRound size={19} /> Team squads
          </h2>
        </div>
        <span className="roster-note">
          Player rosters are public. Secret targets are not.
        </span>
      </div>
      <div className="roster-team-list">
        {teams.map((team) => (
          <article className="roster-team" key={team.team_id}>
            <div className="roster-team-heading">
              <div>
                <strong>{team.team_name}</strong>
                <span>{team.member_count}/5 registered</span>
              </div>
              {team.team_id === ownTeamId && (
                <span className="your-team-chip">YOUR TEAM</span>
              )}
            </div>
            {team.players.length === 0 ? (
              <div className="roster-empty">No players acquired yet</div>
            ) : (
              <div className="roster-player-strip">
                {team.players.map((player) => (
                  <div
                    className="roster-player"
                    key={player.player_id}
                    title={`${player.display_name || player.name} · ${player.role}`}
                  >
                    <PlayerImage
                      className="roster-player-photo"
                      src={player.photo}
                      alt={player.display_name || player.name}
                    />
                    <span>{player.display_name || player.name}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
