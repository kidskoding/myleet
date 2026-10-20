from solution import pyramid_transition


def test_pyramid_transition_buildable():
    assert pyramid_transition("BCD", ["BCC", "CDE", "CEA", "FFF"]) is True


def test_pyramid_transition_always_stuck():
    assert pyramid_transition("AAAA", ["AAB", "AAC", "BCD", "BBE", "DEF"]) is False


def test_pyramid_transition_no_patterns():
    assert pyramid_transition("AB", []) is False


def test_pyramid_transition_two_blocks():
    assert pyramid_transition("AB", ["ABC"]) is True


def test_pyramid_transition_order_matters():
    assert pyramid_transition("BA", ["ABC"]) is False


def test_pyramid_transition_needs_second_level_pattern():
    assert pyramid_transition("AAA", ["AAB", "BBC"]) is True
    assert pyramid_transition("AAA", ["AAB"]) is False
