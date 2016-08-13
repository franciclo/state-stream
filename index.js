var ObjectPathImmutable = require('object-path-immutable')
var ObjectPath = require('object-path')
var diff = require('deep-diff').diff
var Rx = require('rxjs/Rx')

var stateData = {}
var seed = {state: ObjectPath(stateData), diff: []}
var state$ = new Rx.Subject()
var state$Diffs = state$
  .scan(function (acc, chg) {
    var oldState = acc.state.get()
    var newState = ObjectPathImmutable
      .set(oldState, chg.path, chg.value)
    acc.state = ObjectPath(newState)
    acc.diff = diff(oldState, newState)
    return acc
  }, seed)
  .do(function (stateDiff) {
    stateData = ObjectPathImmutable
      .set(stateDiff.state.get())
  })
  .map(function (stateDiff) {
    return stateDiff.diff
  })
  .filter(function (diffs) {
    return diffs
  })
  .mergeMap(function (diffs) {
    return Rx.Observable.from(diffs)
  })
  .publish()

state$Diffs.connect()

function query (path) {
  return {
    on: function (kind) {
      kind = typeof kind === 'string'
        ? [kind] : kind
      return state$Diffs
        .filter(function (d) {
          return d.path.join('.') === path &&
          ~kind.indexOf(d.kind)
        })
        .map(function (d) {
          return d.kind === 'A' ? d.item.rhs : d.rhs
        })
    },
    get value () { return ObjectPath(stateData).get(path) },
    set value (value) { state$.next({path: path, value: value}) }
  }
}

module.exports = query
