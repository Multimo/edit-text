use oatie::doc::*;
use oatie::stepper::*;
use oatie::writer::*;



#[derive(Debug)]
pub struct Walker {
    original_doc: Doc,
    pub doc: DocStepper,
    caret_pos: isize,
}

impl Walker {
    pub fn to_caret(doc: &Doc) -> Walker {
        use oatie::schema::*;

        // Walk the doc until the thing
        let mut walker = Walker {
            original_doc: doc.clone(),
            doc: DocStepper::new(&doc.0),
            caret_pos: -1,
        };

        let mut matched = false;
        loop {
            match walker.doc.head() {
                Some(DocChars(text)) => {
                    walker.caret_pos += 1;
                    walker.doc.skip(1);
                },
                Some(DocGroup(attrs, _)) => {
                    if attrs["tag"] == "cursor" {
                        matched = true;
                        break;
                    }

                    if Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
                        walker.caret_pos += 1;
                    }

                    walker.doc.enter();
                }
                None => {
                    if walker.doc.is_done() {
                        break;
                    } else {
                        walker.doc.exit();
                    }
                }
            }
        }
        if !matched {
            panic!("Didn't find a caret.");
        }

        walker
    }

    pub fn to_cursor(doc: &Doc, cur: &CurSpan) -> Walker {
        use oatie::schema::*;

        // Walk the doc until the thing
        let mut walker = Walker {
            original_doc: doc.clone(),
            doc: DocStepper::new(&doc.0),
            caret_pos: -1,
        };

        let mut match_cur = CurStepper::new(cur);
        let mut matched = false;
        loop {
            match match_cur.head {
                Some(CurGroup) | Some(CurChar) => {
                    matched = true;
                    break;
                }
                _ => {}
            }

            match walker.doc.head() {
                Some(DocChars(text)) => {
                    walker.caret_pos += 1;

                    walker.doc.skip(1);
                    match_cur.skip();
                },
                Some(DocGroup(attrs, _)) => {
                    if Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
                        walker.caret_pos += 1;
                    }

                    walker.doc.enter();
                    match_cur.enter();
                }
                None => {
                    if walker.doc.is_done() {
                        break;
                    } else {
                        walker.doc.exit();
                        match_cur.exit();
                    }
                }
            }
        }
        if !matched {
            panic!("Didn't find the cursor.");
        }

        walker
    }

    // TODO update the caret_pos as a result
    pub fn back_block(&mut self) -> &mut Walker {
        use oatie::schema::*;

        loop {
            self.doc.unenter();
            self.doc.next();

            match self.doc.head() {
                Some(DocGroup(attrs, ..)) => {
                    if Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
                        break;
                    }
                }
                _ => {}
            }
        }
        self
    }

    pub fn next_char(&mut self) -> &mut Walker {
        use oatie::schema::*;

        loop {
            match self.doc.head() {
                Some(DocChars(text)) => {
                    self.caret_pos += 1;
                    self.doc.skip(1);
                    break;
                },
                Some(DocGroup(attrs, _)) => {
                    if attrs["tag"] == "cursor" {
                        break;
                    }

                    if Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
                        self.caret_pos += 1;
                        break;
                    }

                    self.doc.enter();
                }
                None => {
                    if self.doc.is_done() {
                        break;
                    } else {
                        self.doc.exit();
                    }
                }
            }
        }

        self
    }

    pub fn back_char(&mut self) -> &mut Walker {
        self.doc.unskip(1);
        self.snap_char()
    }

    pub fn snap_char(&mut self) -> &mut Walker {
        use oatie::schema::*;

        let mut matched = false;
        loop {
            match self.doc.head() {
                Some(DocChars(text)) => {
                    self.caret_pos -= 1;
                    matched = true;
                    break;
                },
                Some(DocGroup(attrs, _)) => {
                    self.doc.unenter();
                }
                None => {
                    // TODO check backwards is_done()!!!
                    if self.doc.is_done() {
                        break;
                    } else {
                        self.doc.exit();
                        match self.doc.head() {
                            Some(DocGroup(attrs, _)) => {
                                self.doc.prev();
                                if Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
                                    self.caret_pos -= 1;
                                    break;
                                }
                            }
                            _ => unreachable!(),
                        }
                    }
                }
            }
        }
        if !matched {
            panic!("Didn't find a cursor.");
        }
        self
    }

    pub fn to_writers(&self) -> (DelWriter, AddWriter) {
        let mut del = DelWriter::new();
        let mut add = AddWriter::new();

        // Walk the doc until the thing
        let mut doc_stepper = DocStepper::new(&self.original_doc.0);

        while self.doc != doc_stepper {
            match doc_stepper.head() {
                Some(DocChars(text)) => {
                    del.skip(1);
                    add.skip(1);
                    doc_stepper.skip(1);
                },
                Some(DocGroup(attrs, _)) => {
                    del.begin();
                    add.begin();
                    doc_stepper.enter();
                }
                None => {
                    del.exit();
                    add.exit();
                    if doc_stepper.is_done() {
                        break;
                    } else {
                        doc_stepper.exit();
                    }
                }
            }
        }

        (del, add)
    }
}

// pub trait DocWalker: Sized {
//     fn _walk(
//         &mut self,
//         doc: &mut DocStepper,
//     ) {
//         while !doc.is_done() && doc.head().is_some() {
//             match doc.head().unwrap() {
//                 DocChars(value) => {
//                     self.chars(value);
//                     doc.next();
//                 }
//                 DocGroup(attrs, span) => {
//                     if self.enter(&attrs, &span) {
//                         doc.enter();
//                         self._walk(doc);
//                         doc.exit();
//                         self.exit(&attrs);
//                     } else {
//                         doc.skip(1);
//                     }
//                 }
//             }
//         }
//     }

//     fn walk(&mut self, doc: &Doc) -> &mut Self {
//         let mut stepper = DocStepper::new(&doc.0);
//         self._walk(&mut stepper);
//         self
//     }

//     fn chars(&mut self, _chars: String) {}
//     fn enter(&mut self, _attrs: &Attrs, _span: &DocSpan) -> bool { true }
//     fn exit(&mut self, _attrs: &Attrs) {}

//     fn op(&self) -> Op { op_span!([], []) }
// }


// #[derive(Debug)]
// pub struct CharInsert {
//     pub del: DelWriter,
//     pub add: AddWriter,

//     character: char,
//     pos: usize,
// }

// impl CharInsert {
//     pub fn new(character: char) -> CharInsert {
//         CharInsert {
//             del: DelWriter::new(),
//             add: AddWriter::new(),
//             character,
//             pos: 0,
//         }
//     }
// }

// impl DocWalker for CharInsert {
//     fn chars(&mut self, text: String) {
//         for _ in 0..text.chars().count() {
//             self.del.skip(1);
//             self.add.skip(1);
//             self.pos += 1;
//         }
//     }

//     fn enter(&mut self, attrs: &Attrs, _span: &DocSpan) -> bool {
//         use oatie::schema::*;

//         // Skip over cursor.
//         if attrs["tag"] == "cursor" {
//             self.add.chars(&format!("{}", self.character));

//             self.del.skip(1);
//             self.add.skip(1);
//             return false;
//         }

//         self.del.begin();
//         self.add.begin();

//         if Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
//             self.pos += 1;
//         }

//         true
//     }

//     fn exit(&mut self, _attrs: &Attrs) {
//         self.del.exit();
//         self.add.exit();
//     }
// }


// #[derive(Debug)]
// pub struct CursorParentGroup {
//     pub del: DelWriter,
//     pub add: AddWriter,

//     cursor: bool,
//     terminated: bool,
//     new_attrs: Attrs,
// }

// impl CursorParentGroup {
//     pub fn new(new_attrs: &Attrs) -> CursorParentGroup {
//         CursorParentGroup {
//             del: DelWriter::new(),
//             add: AddWriter::new(),
//             cursor: false,
//             terminated: false,
//             new_attrs: new_attrs.clone(),
//         }
//     }
// }

// impl DocWalker for CursorParentGroup {
//     fn chars(&mut self, text: String) {
//         self.del.skip(text.chars().count());
//         self.add.skip(text.chars().count());
//     }

//     fn enter(&mut self, attrs: &Attrs, _span: &DocSpan) -> bool {
//         if attrs["tag"] == "cursor" {
//             self.cursor = true;
//         }

//         if self.cursor || self.terminated {
//             self.del.skip(1);
//             self.add.skip(1);
//             return false;
//         }

//         self.del.begin();
//         self.add.begin();
//         true
//     }

//     fn exit(&mut self, attrs: &Attrs) {
//         use oatie::schema::*;

//         if self.cursor && Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
//             self.del.close();
//             self.add.close(self.new_attrs.clone());
//             self.cursor = false;
//             self.terminated = true;
//         } else {
//             self.del.exit();
//             self.add.exit();
//         }
//     }
// }


// #[derive(Debug)]
// pub struct CaretSet {
//     pub del: DelWriter,
//     pub add: AddWriter,

//     destination: usize,
//     pos: usize,
//     terminated: bool,
// }

// impl CaretSet {
//     pub fn new(destination: usize) -> CaretSet {
//         CaretSet {
//             del: DelWriter::new(),
//             add: AddWriter::new(),
//             destination,
//             pos: 0,
//             terminated: false,
//         }
//     }

//     fn check_position(&mut self) {
//         if self.pos == self.destination + 1 {
//             self.add.begin();
//             self.add.close(hashmap! { "tag".to_string() => "cursor".to_string() });
//             self.terminated = true;
//         }
//     }
// }

// impl DocWalker for CaretSet {
//     fn chars(&mut self, text: String) {
//         for _ in 0..text.chars().count() {
//             self.del.skip(1);
//             self.add.skip(1);
//             self.pos += 1;
//             self.check_position();
//         }
//     }

//     fn enter(&mut self, attrs: &Attrs, _span: &DocSpan) -> bool {
//         use oatie::schema::*;

//         // Skip over cursor.
//         if attrs["tag"] == "cursor" {
//             self.del.group_all();
//             return false;
//         }

//         self.del.begin();
//         self.add.begin();

//         if Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
//             self.pos += 1;
//             self.check_position();
//         }

//         true
//     }

//     fn exit(&mut self, _attrs: &Attrs) {
//         self.del.exit();
//         self.add.exit();
//     }
// }



// #[derive(Debug)]
// pub struct CaretPosition {
//     pub pos: usize,
//     pub terminated: bool,
// }

// impl CaretPosition {
//     pub fn new() -> CaretPosition {
//         CaretPosition {
//             pos: 0,
//             terminated: false,
//         }
//     }

//     pub fn pos(&self) -> usize {
//         if self.pos > 0 { self.pos - 1 } else { 0 }
//     }
// }

// impl DocWalker for CaretPosition {
//     fn chars(&mut self, text: String) {
//         if !self.terminated {
//             self.pos += text.chars().count();
//         }
//     }

//     fn enter(&mut self, attrs: &Attrs, _span: &DocSpan) -> bool {
//         use oatie::schema::*;

//         if attrs["tag"] == "cursor" {
//             self.terminated = true;
//         }

//         if self.terminated {
//             return false;
//         }

//         if Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
//             self.pos += 1;
//         }

//         true
//     }
// }


// #[derive(Debug)]
// pub struct CursorToCaretPosition {
//     pos: usize,
//     terminated: bool,
//     cur_stepper: CurStepper,
//     skip_track: usize,
// }

// impl CursorToCaretPosition {
//     pub fn new(cur_stepper: CurStepper) -> CursorToCaretPosition {
//         CursorToCaretPosition {
//             pos: 0,
//             terminated: false,
//             cur_stepper: cur_stepper,
//             skip_track: 0,
//         }
//     }

//     pub fn pos(&self) -> usize {
//         if self.pos > 0 { self.pos - 1 } else { 0 }
//     }
// }

// impl DocWalker for CursorToCaretPosition {
//     fn chars(&mut self, text: String) {
//         println!("$$$ chars: {:?} [{:?}]", text, self.skip_track);

//         if self.skip_track > 0 {
//             self.pos += text.chars().count();
//         } else {
//             for i in 0..text.chars().count() {
//                 println!("next char: {:?}", i);

//                 if !self.terminated {
//                     self.pos += 1;
//                 }
                
//                 match self.cur_stepper.head.clone() {
//                     Some(CurGroup) | Some(CurChar) => {
//                         self.terminated = true;
//                         self.cur_stepper.next();
//                     }
//                     Some(..) => {
//                         self.cur_stepper.skip();
//                     }
//                     None => {
//                         break; // I guess?
//                     }
//                 }
//             }
//         }
//     }

//     fn enter(&mut self, attrs: &Attrs, _span: &DocSpan) -> bool {
//         use oatie::schema::*;

//         println!("$$$ enter: {:?} [{:?}]", attrs, self.skip_track);

//         match self.cur_stepper.head {
//             Some(CurGroup) | Some(CurChar) => {
//                 self.terminated = true;
//             }
//             None => {
//                 return false;
//             }
//             _ => { }
//         }

//         if self.terminated {
//             self.cur_stepper.next();
//             return false;
//         }

//         if self.skip_track > 0 {
//             self.skip_track += 1;
//         } else if let Some(CurSkip(..)) = self.cur_stepper.head {
//             self.cur_stepper.skip();
//             self.skip_track += 1;
//         } else {
//             println!("----ENTER: {:?}", self.cur_stepper);
//             self.cur_stepper.enter();
//         }

//         if Tag(attrs.clone()).tag_type() == Some(TrackType::Blocks) {
//             self.pos += 1;
//         }

//         true
//     }

//     fn exit(&mut self, attrs: &Attrs) {
//         println!("$$$ exit: {:?} [{:?}]", attrs, self.skip_track);

//         if self.skip_track > 0 {
//             self.skip_track -= 1;
//         } else if self.skip_track == 0 {
//             println!("----EXIT: {:?}", self.cur_stepper);
//             self.cur_stepper.exit();
//         }
//     }
// }

