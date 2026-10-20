from solution import longest_valid_parentheses


def test_longest_valid_parentheses_partial():
    assert longest_valid_parentheses("(()") == 2


def test_longest_valid_parentheses_normal():
    assert longest_valid_parentheses(")()())") == 4


def test_longest_valid_parentheses_empty():
    assert longest_valid_parentheses("") == 0
