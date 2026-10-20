from solution import simplify_path


def test_simplify_path_trailing_slash():
    assert simplify_path("/home/") == "/home"


def test_simplify_path_above_root():
    assert simplify_path("/../") == "/"


def test_simplify_path_double_slash():
    assert simplify_path("/home//foo/") == "/home/foo"


def test_simplify_path_dots():
    assert simplify_path("/a/./b/../../c/") == "/c"
