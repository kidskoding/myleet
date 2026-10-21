from solution import AllOne


def test_all_one_basic_inc_and_extrema():
    obj = AllOne()
    obj.inc("hello")
    obj.inc("hello")
    assert obj.get_max_key() == "hello"
    assert obj.get_min_key() == "hello"
    obj.inc("leet")
    assert obj.get_max_key() == "hello"
    assert obj.get_min_key() == "leet"


def test_all_one_dec_removes_key():
    obj = AllOne()
    obj.inc("a")
    obj.inc("b")
    obj.inc("b")
    obj.dec("b")
    assert obj.get_max_key() in {"a", "b"}
    assert obj.get_min_key() in {"a", "b"}
    obj.dec("b")
    assert obj.get_max_key() == "a"
    assert obj.get_min_key() == "a"


def test_all_one_empty_returns_empty_string():
    obj = AllOne()
    assert obj.get_max_key() == ""
    assert obj.get_min_key() == ""


def test_all_one_multiple_keys_same_count():
    obj = AllOne()
    obj.inc("x")
    obj.inc("y")
    assert obj.get_max_key() in {"x", "y"}
    assert obj.get_min_key() in {"x", "y"}
