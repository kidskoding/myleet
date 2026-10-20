from solution import longest_diverse_string


def check(a: int, b: int, c: int, expected_length: int) -> None:
    s = longest_diverse_string(a, b, c)
    assert len(s) == expected_length
    assert s.count("a") <= a and s.count("b") <= b and s.count("c") <= c
    assert set(s) <= {"a", "b", "c"}
    assert "aaa" not in s and "bbb" not in s and "ccc" not in s


def test_longest_diverse_string_one_dominant():
    check(1, 1, 7, 8)


def test_longest_diverse_string_capped_by_separator():
    check(7, 1, 0, 5)


def test_longest_diverse_string_all_zero():
    assert longest_diverse_string(0, 0, 0) == ""


def test_longest_diverse_string_balanced_uses_all():
    check(2, 2, 2, 6)


def test_longest_diverse_string_single_letter_only():
    check(0, 5, 0, 2)


def test_longest_diverse_string_uneven_but_all_fit():
    check(4, 1, 1, 6)
