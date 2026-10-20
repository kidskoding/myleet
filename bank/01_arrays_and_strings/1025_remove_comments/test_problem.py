from solution import remove_comments


def test_remove_comments_example():
    source = [
        "/*Test program */",
        "int main()",
        "{ ",
        "  // variable declaration ",
        "int a, b, c;",
        "/* This is a test",
        "   multiline  ",
        "   comment for ",
        "   testing */",
        "a = b + c;",
        "}",
    ]
    assert remove_comments(source) == ["int main()", "{ ", "  ", "int a, b, c;", "a = b + c;", "}"]


def test_remove_comments_block_joins_lines():
    assert remove_comments(["a/*comment", "line", "more_comment*/b"]) == ["ab"]


def test_remove_comments_line_comment_hides_block_start():
    assert remove_comments(["a//b/*c", "d*/e"]) == ["a", "d*/e"]


def test_remove_comments_inline_block():
    assert remove_comments(["a/*b*/c"]) == ["ac"]


def test_remove_comments_slash_star_slash_does_not_close():
    assert remove_comments(["/*/x*/y"]) == ["y"]


def test_remove_comments_empty_lines_dropped():
    assert remove_comments(["/*abc*/", "x"]) == ["x"]
