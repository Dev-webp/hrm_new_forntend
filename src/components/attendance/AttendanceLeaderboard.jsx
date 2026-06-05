function AttendanceLeaderboard({ leaderboard, loading }) {
  if (loading) {
    return <div className="dept-leaderboard">Loading...</div>;
  }

  if (!leaderboard?.length) {
    return <div className="dept-leaderboard">No department data</div>;
  }

  return (
    <div className="dept-leaderboard">
      {leaderboard.map((d) => (
        <div className="dept-row" key={d.name}>
          <span style={{ width: 160 }}>
            <i className="fas fa-building" /> {d.name}
          </span>
          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${d.percent}%` }}
            />
          </div>
          <span>{d.percent}%</span>
        </div>
      ))}
    </div>
  );
}

export default AttendanceLeaderboard;
