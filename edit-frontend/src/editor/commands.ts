// Commands

export function RenameGroup(tag: string, curspan) {
  return {
    tag: 'RenameGroup' as 'RenameGroup',
    'RenameGroup': [tag, curspan],
  }
}

export function Keypress(
  keyCode: number,
  metaKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
) {
  return {
    tag: 'Keypress' as 'Keypress',
    'Keypress': [keyCode, metaKey, shiftKey, altKey],
  }
}

export function Character(
  charCode: number,
) {
  return {
    tag: 'Character' as 'Character',
    'Character': charCode,
  }
}

export function InsertText(
  text: string,
) {
  return {
    tag: 'InsertText' as 'InsertText',
    'InsertText': text,
  }
}

export function CursorAnchor(
  curspan: [any],
) {
  return {
    tag: 'CursorAnchor' as 'CursorAnchor',
    'CursorAnchor': curspan,
  }
}

export function CursorTarget(
  curspan: [any],
) {
  return {
    tag: 'CursorTarget' as 'CursorTarget',
    'CursorTarget': curspan,
  }
}

export function Button(
  button: number,
) {
  return {
    tag: 'Button' as 'Button',
    'Button': button,
  }
}

export function Load(
  load: any,
) {
  return {
    tag: 'Load' as 'Load',
    'Load': load,
  }
}

export function Monkey(
  enabled: boolean,
) {
  return {
    tag: 'Monkey' as 'Monkey',
    'Monkey': enabled,
  };
}

export function Connect(
  client: string,
) {
  return {
    tag: 'Connect' as 'Connect',
    'Connect': client,
  };
}

export type Command
  = ReturnType<typeof Monkey>
  | ReturnType<typeof RenameGroup>
  | ReturnType<typeof Keypress>
  | ReturnType<typeof Character>
  | ReturnType<typeof CursorAnchor>
  | ReturnType<typeof CursorTarget>
  | ReturnType<typeof Button>
  | ReturnType<typeof Load>
  | ReturnType<typeof Connect>
  | ReturnType<typeof InsertText>
  ;
