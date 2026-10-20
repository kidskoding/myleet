from solution import robot_with_string


def test_robot_with_string_small_last():
    assert robot_with_string("zza") == "azz"


def test_robot_with_string_interleaved():
    assert robot_with_string("bac") == "abc"


def test_robot_with_string_reverse_tail():
    assert robot_with_string("bdda") == "addb"


def test_robot_with_string_single_char():
    assert robot_with_string("a") == "a"


def test_robot_with_string_repeated_char():
    assert robot_with_string("aaa") == "aaa"


def test_robot_with_string_held_chars_come_out_reversed():
    assert robot_with_string("bca") == "acb"
