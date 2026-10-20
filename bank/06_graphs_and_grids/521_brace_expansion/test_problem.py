from solution import expand


def test_expand_two_groups():
    assert expand("{a,b}c{d,e}f") == ["acdf", "acef", "bcdf", "bcef"]


def test_expand_no_braces():
    assert expand("abcd") == ["abcd"]


def test_expand_unsorted_group_is_sorted():
    assert expand("{b,a}") == ["a", "b"]


def test_expand_adjacent_groups():
    assert expand("{a,b}{z,x,y}") == ["ax", "ay", "az", "bx", "by", "bz"]


def test_expand_single_option_group():
    assert expand("x{q}y") == ["xqy"]
