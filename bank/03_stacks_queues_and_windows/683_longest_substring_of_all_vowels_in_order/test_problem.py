from solution import longest_beautiful_substring


def test_longest_beautiful_substring_example_one():
    assert longest_beautiful_substring("aeiaaioaaaaeiiiiouuuooaauuaeiu") == 13


def test_longest_beautiful_substring_example_two():
    assert longest_beautiful_substring("aeeeiiiioooauuuaeiou") == 5


def test_longest_beautiful_substring_single_letter():
    assert longest_beautiful_substring("a") == 0


def test_longest_beautiful_substring_exact():
    assert longest_beautiful_substring("aeiou") == 5


def test_longest_beautiful_substring_missing_u():
    assert longest_beautiful_substring("aaeeiioo") == 0


def test_longest_beautiful_substring_reversed():
    assert longest_beautiful_substring("uoiea") == 0
