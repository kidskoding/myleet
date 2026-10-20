from solution import count_letters


def test_count_letters_example():
    assert count_letters("aaaba") == 8


def test_count_letters_single_run():
    assert count_letters("aaaaaaaaaa") == 55


def test_count_letters_single_character():
    assert count_letters("a") == 1


def test_count_letters_all_distinct():
    assert count_letters("abc") == 3


def test_count_letters_two_runs():
    assert count_letters("aabb") == 6
