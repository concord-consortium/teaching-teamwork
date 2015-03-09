module.exports = React.createClass({
  render: function() {
    var rows = this.props.goal.map(function(val, i) {
      return (<tr>
                <td>{ i+1 }</td>
                <td>{ val }</td>
                <td className="actual"></td>
              </tr>
              );
    });
    return (
      <div id="values">
        <table>
          <tr>
            <th></th>
            <th>Goal ({ this.props.measurement })</th>
            <th>Actual</th>
          </tr>
          { rows }
        </table>
      </div>
    );
  }
});
