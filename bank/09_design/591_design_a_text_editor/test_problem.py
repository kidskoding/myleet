from solution import TextEditor


def test_text_editor_example():
    editor = TextEditor()
    editor.add_text("leetcode")
    assert editor.delete_text(4) == 4
    editor.add_text("practice")
    assert editor.cursor_right(3) == "etpractice"
    assert editor.cursor_left(8) == "leet"
    assert editor.delete_text(10) == 4
    assert editor.cursor_left(2) == ""
    assert editor.cursor_right(6) == "practi"


def test_text_editor_empty_editor():
    editor = TextEditor()
    assert editor.delete_text(5) == 0
    assert editor.cursor_left(3) == ""
    assert editor.cursor_right(3) == ""


def test_text_editor_insert_in_middle():
    editor = TextEditor()
    editor.add_text("abc")
    assert editor.cursor_left(1) == "ab"
    editor.add_text("X")
    assert editor.cursor_right(5) == "abXc"
    assert editor.delete_text(2) == 2
    assert editor.cursor_left(0) == "ab"


def test_text_editor_view_capped_at_ten():
    editor = TextEditor()
    editor.add_text("abcdefghijklmnop")
    assert editor.cursor_left(0) == "ghijklmnop"
    assert editor.cursor_left(3) == "defghijklm"
    assert editor.cursor_right(100) == "ghijklmnop"


def test_text_editor_delete_only_left_of_cursor():
    editor = TextEditor()
    editor.add_text("hello")
    assert editor.cursor_left(3) == "he"
    assert editor.delete_text(5) == 2
    assert editor.cursor_right(10) == "llo"
