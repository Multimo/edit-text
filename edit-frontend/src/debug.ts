declare var window: any;

let POEM = `The Telegraphers Valentine, by J.C. Maxwell, 1860

The tendrils of my soul are twined
With thine, though many a mile apart.
And thine in close coiled circuits wind
Around the needle of my heart.

Constant as Daniel, strong as Grove.
Ebullient throughout its depths like Smee,
My heart puts forth its tide of love,
And all its circuits close in thee.`;

let POEMCACHE = POEM;

let int: any = null;
let delay = 0;
let delcount = POEMCACHE.length - 3;
const DEBUG = {
    startWriter: () => {
        if (!int) {
            int = setInterval(() => {
                if (delay > 0) {
                    delay--;
                    return;
                }

                if (POEM.match(/^\n\n/)) {
                    POEM = POEM.slice(2);
                    delay = 20;

                    let KeyboardEventAny = KeyboardEvent as any;
                    let evt = new KeyboardEventAny("keydown", {
                        bubbles: true,
                        cancelable: true,
                        keyCode: 13,
                    });
                    document.dispatchEvent(evt);
                }
                else if (POEM.length > 0) {
                    let char = POEM[0];
                    POEM = POEM.slice(1);

                    let KeyboardEventAny = KeyboardEvent as any;
                    let evt = new KeyboardEventAny("keypress", {
                        bubbles: true,
                        cancelable: true,
                        charCode: char.charCodeAt(0),
                    });
                    document.dispatchEvent(evt);

                    if (POEM.match(/^\n/)) {
                        delay = 15;
                    }
                } else if (delcount > 0) {
                    delcount--;
                    let KeyboardEventAny = KeyboardEvent as any;
                    let evt = new KeyboardEventAny("keydown", {
                        bubbles: true,
                        cancelable: true,
                        keyCode: 8,
                    });
                    document.dispatchEvent(evt);
                } else if (delcount == 0) {
                    delcount = POEMCACHE.length - 3;
                    POEM = POEMCACHE;
                    delay = 3;
                }
            }, 50);
        }
    },
    stopWriter: () => {
        console.log('stop');
        if (int !== null) {
            clearInterval(int);
        }
        int = null;
    },
};

window.DEBUG = DEBUG;

export default DEBUG;
