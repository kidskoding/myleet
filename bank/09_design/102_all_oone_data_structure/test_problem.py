from solution import AllOne


def test_all_one_empty_returns_empty_strings():
    counter = AllOne()
    assert counter.get_max_key() == ""
    assert counter.get_min_key() == ""


def test_all_one_tracks_max_and_min():
    counter = AllOne()
    counter.inc("hello")
    counter.inc("hello")
    assert counter.get_max_key() == "hello"
    assert counter.get_min_key() == "hello"
    counter.inc("leet")
    assert counter.get_max_key() == "hello"
    assert counter.get_min_key() == "leet"


def test_all_one_dec_to_zero_removes_key():
    counter = AllOne()
    counter.inc("a")
    counter.dec("a")
    assert counter.get_max_key() == ""
    assert counter.get_min_key() == ""


def test_all_one_ties_return_any_key_at_that_count():
    counter = AllOne()
    counter.inc("a")
    counter.inc("b")
    assert counter.get_max_key() in {"a", "b"}
    assert counter.get_min_key() in {"a", "b"}


def test_all_one_dec_moves_key_below_others():
    counter = AllOne()
    for _ in range(3):
        counter.inc("a")
    for _ in range(2):
        counter.inc("b")
    counter.dec("a")
    counter.dec("a")
    assert counter.get_max_key() == "b"
    assert counter.get_min_key() == "a"


def test_all_one_many_operations():
    counter = AllOne()
    for key, times in (("x", 5), ("y", 1), ("z", 3)):
        for _ in range(times):
            counter.inc(key)
    assert counter.get_max_key() == "x"
    assert counter.get_min_key() == "y"
    counter.dec("y")
    assert counter.get_min_key() == "z"
    for _ in range(3):
        counter.dec("x")
    assert counter.get_max_key() == "z"
    assert counter.get_min_key() == "x"
