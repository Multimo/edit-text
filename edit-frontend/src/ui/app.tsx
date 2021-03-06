// Global CSS
import '../../styles/edit.scss';

// import * as Clipboard from 'clipboard';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import axios from 'axios';
import * as Raven from 'raven-js';

import * as commands from '../editor/commands';
import * as route from './route';
import { Editor } from '../editor/editor';
import { Network, ProxyNetwork, WasmNetwork } from './network';
import { ClientImpl } from '../editor/client';

declare var CONFIG: any;

// Check page configuration.
if (!CONFIG.configured) {
  alert('The window.CONFIG variable was not configured by the server!')
}

const ROOT_QUERY = '.edit-text';

function UiElement(props, element, i = Math.random()) {
  if ('Button' in element) {
    let button = element.Button;
    return (
      <button
        key={i}
        onClick={
          () => props.editor.network.nativeCommand(commands.Button(button[1]))
        }
        className={button[2] ? 'active' : ''}
      >{button[0]}</button>
    )
  } else if ('ButtonGroup' in element) {
    return (
      <div className="menu-buttongroup" key={i}>
        {element.ButtonGroup.map((x, i) => UiElement(props, x, i))}
      </div>
    )
  }
  return null;
}

function NativeButtons(
  props
) {
  if (!props.buttons.length) {
    return (
      <div id="native-buttons">Loading...</div>
    );
  }
  return (
    <div id="native-buttons">{
      props.buttons.map((x, i) => UiElement(props, x, i))
    }</div>
  );
}

export function graphqlPage(id: string) {
  return axios.post(
    route.graphqlUrl(),
    {
      query:
`
query ($id: String!) { page(id: $id) { markdown }}
`,
      variables: {
         id,
      },
    }
  );
}

export function graphqlCreatePage(id: string, markdown: string) {
  return axios.post(
    route.graphqlUrl(),
    {
      query:
`
mutation ($id: String!, $markdown: String!) { createPage(id: $id, markdown: $markdown) { __typename } }
`,
      variables: {
        id,
        markdown,
      },
    }
  );
}

class MarkdownModal extends React.Component {
  props: {
    markdown: string,
    onModal: Function,
  };

  state = {
    markdown: this.props.markdown,
  };

  render() {
    let self = this;
    return (
      <Modal>
        <h1>Markdown Import/Export</h1>
        <p>The document is displayed as Markdown in the textarea below. Feel free to copy it, or modify it and click "Import" to overwrite the current page with your changes.</p>
        <textarea
          value={self.state.markdown}
          onChange={(e) => {
            this.setState({
              markdown: e.target.value,
            });
          }}
        />
        <div className="modal-buttons">
          <button className="dismiss" onClick={() => self.props.onModal(null)}>Back</button>
          <div style={{flex: 1}} />
          <button className="load" onClick={() => {
            graphqlCreatePage(route.pageId(), self.state.markdown)
            .then(req => {
              if (req.data.errors && req.data.errors.length) {
                console.log(req.data.errors);
                console.error('Error in markdown save.');
              } else {
                console.log('Update success, reloading...');
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              }
            })
            .catch(err => console.error(err));
          }}>Import</button>
        </div>
      </Modal>
    );
  }
}

class LocalButtons extends React.Component {
  props: {
    editorID: string,
    editor: any,
    onModal: Function,
  };

  state = {};

  onMarkdownClick() {
    let self = this;
    graphqlPage(route.pageId())
    .then(res => {
      let graphql = res.data;
      let markdown = graphql.data.page.markdown;
      
      self.props.onModal(
        <MarkdownModal
          markdown={markdown}
          onModal={self.props.onModal}
        />
      );
    })
    .catch(err => {
      console.error('onSaveMarkdown:', err);
    })
  }

  toggleWidth() {
    document.body.classList.toggle('theme-column');
    if (!document.body.classList.contains('theme-column')) {
      localStorage.setItem('edit-text:theme-wide', '1');
    } else {
      localStorage.removeItem('edit-text:theme-wide');
    }
  }

  render(): React.ReactNode {
    return (
      <div className="menu-buttongroup" style={{marginRight: 0}}>
        <button onClick={() => this.onMarkdownClick()}>Load/Save</button>

        <button id="width" onClick={() => this.toggleWidth()}>Page Width</button>

        <b style={{marginLeft: 10, whiteSpace: 'nowrap'}}>
          Client: <kbd tabIndex={0}>{this.props.editorID}</kbd>
        </b>
      </div>
    );
  }
}

function Modal(props: any) {
  return (
    <div id="modal">
      <div id="modal-dialog">
        {props.children}
      </div>
    </div>
  );
}


export type NoticeProps = {
  element: React.ReactElement<any>,
  level: 'notice' | 'error',
};

function FooterNotice(props: {
  onDismiss: () => void,
  children: React.ReactNode,
  level: string,
}) {
  return (
    <div className={`footer-bar ${props.level}`}>
      <div>{props.children}</div>
      <span onClick={props.onDismiss}>&times;</span>
    </div>
  );
}


// Initialize child editor.
export class EditorFrame extends React.Component {
  props: {
    network: Network & ClientImpl,
    body: string,
  };

  state: {
    body: string,
    buttons: any,
    editorID: string,
    modal: React.ReactNode,
    notices: Array<NoticeProps>,
  };

  KEY_WHITELIST: any;
  network: Network & ClientImpl;
  markdown: string;

  constructor(
    props,
  ) {
    super(props);

    this.KEY_WHITELIST = [];

    this.network = props.network;
    this.network.onNativeMessage = this.onNativeMessage.bind(this);

    // Background colors.
    // TODO make these actionable on this object right?
    this.network.onNativeClose = function () {
      document.body.style.background = 'red';
      console.error('!!! client close');
    };
    this.network.onSyncClose = function () {
      document.body.style.background = 'red';
      console.error('!!! server close');
    };

    this.state = {
      body: this.props.body,
      buttons: [],
      editorID: '$$$$$$',
      modal: null,
      notices: [],
    };
  }

  showNotification(notice: NoticeProps) {
    this.setState({
      notices: this.state.notices.slice().concat([notice]),
    })
  }

  render(): React.ReactNode {
    let modalClass = this.state.modal == null ? '' : 'modal-active';
    return (
      <div className="fullpage">
        {this.state.modal}
        <div id="root-layout" className={modalClass}>
          <div id="toolbar">
            <a href="/" id="logo">{CONFIG.title}</a>
            <NativeButtons
              editor={this}
              buttons={this.state.buttons} 
            />
            <LocalButtons
              editor={this}
              editorID={this.state.editorID}
              onModal={(modal) => {
                this.setState({
                  modal
                });
              }}
            />
          </div>

          <div id="edit-text-outer">
            <Editor 
              network={this.props.network} 
              KEY_WHITELIST={this.KEY_WHITELIST}
              content={this.state.body}
              editorID={this.state.editorID}
              disabled={!!this.state.modal}
            />
          </div>
        </div>
        <div id="footer">{
          this.state.notices.map((x, key) => {
            return (
              <FooterNotice 
                key={key}
                onDismiss={() => {
                  let notices = this.state.notices.slice();
                  notices.splice(key, 1);
                  this.setState({
                    notices,
                  });
                }}
                level={x.level}
              >
                {x.element}
              </FooterNotice>
            );
          })
        }</div>
      </div>
    );
  }

  // Received message on native socket
  onNativeMessage(parse: any) {
    const editor = this;

    if (parse.Init) {
      let editorID = parse.Init;

      this.setState({
        editorID,
      });

      console.info('Editor "%s" connected.', editorID);

      // Log the editor ID.
      Raven.setExtraContext({
        editor_id: editorID,
      });
    }

    else if (parse.Update) {
      // Update page content
      this.setState({
        body: parse.Update[0],
      });
    }

    else if (parse.Controls) {
      // console.log('SETUP CONTROLS', parse.Controls);

      // Update the key list in-place.
      editor.KEY_WHITELIST.splice.apply(editor.KEY_WHITELIST,
        [0, 0].concat(parse.Controls.keys.map(x => ({
          keyCode: x[0],
          metaKey: x[1],
          shiftKey: x[2],
        })))
      );

      // Update buttons view
      this.setState({
        buttons: parse.Controls.buttons,
      });
    }

    else {
      console.error('Unknown packet:', parse);
    }
  }
}


function multiConnect(network: Network & ClientImpl) {
  // Blur/Focus classes.
  window.addEventListener('focus', () => {
    document.body.classList.remove('blurred');
  });
  window.addEventListener('blur', () => {
    document.body.classList.add('blurred');
  });
  document.body.classList.add('blurred');

  // Forward Monkey events.
  window.onmessage = (event) => {
    let editor = this;

    // Sanity check.
    if (typeof event.data != 'object') {
      return;
    }
    let msg = event.data;

    if ('Monkey' in msg) {
      // TODO reflect this in the app
      network.nativeCommand(commands.Monkey(msg.Monkey));
    }
  };
}

export function start() {
  let network = CONFIG.wasm ? new WasmNetwork() : new ProxyNetwork();

  // Connect to parent window (if exists).
  if (window.parent != window) {
    multiConnect(network);
  }

  // TODO move this to a better logical location and manage local storage better
  if (localStorage.getItem('edit-text:theme-wide')) {
    document.body.classList.remove('theme-column');
  }

  // TODO fix the adding of editing-blurred to the bdy
  // document.addEventListener('focus', () => {
  //   // console.log('(page focus)');
  //   document.body.classList.remove('editing-blurred');
  // });
  // document.addEventListener('blur', () => {
  //   // console.log('(page blur)');
  //   document.body.classList.add('editing-blurred');
  // });
  // document.body.classList.add('editing-blurred');

  // Create the editor frame.
  let editorFrame;
  ReactDOM.render(
    <EditorFrame
      network={network}
      body={document.querySelector('.edit-text')!.innerHTML}
      ref={c => editorFrame = c}
    />,
    document.querySelector('#content')!,
    () => {
      // Default notification
      if (!sessionStorage.getItem("its-only-funny-once")) {
        editorFrame.showNotification({
          element: (<div>
            Check out <a href="http://github.com/tcr/edit-text">edit-text</a> on Github for more information.
          </div>),
          level: 'notice',
        });
        sessionStorage.setItem("its-only-funny-once", 'true');
      }

      // Connect to remote sockets.
      network.nativeConnect(editorFrame)
        .then(() => network.syncConnect(editorFrame));
    }
  );
}
