from solution import shortest_beautiful_substring


def test_shortest_beautiful_substring_example_one():
    assert shortest_beautiful_substring("100011001", 3) == "11001"


def test_shortest_beautiful_substring_example_two():
    assert shortest_beautiful_substring("1011", 2) == "11"


def test_shortest_beautiful_substring_none():
    assert shortest_beautiful_substring("000", 1) == ""


def test_shortest_beautiful_substring_single_one():
    assert shortest_beautiful_substring("1", 1) == "1"


def test_shortest_beautiful_substring_tie_on_length():
    assert shortest_beautiful_substring("0101101", 2) == "11"


def test_shortest_beautiful_substring_lex_tie_break():
    assert shortest_beautiful_substring("1101011", 3) == "1011"
