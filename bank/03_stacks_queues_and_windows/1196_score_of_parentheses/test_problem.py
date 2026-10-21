from solution import score_of_parentheses


def test_score_of_parentheses_simple():
    assert score_of_parentheses("()") == 1


def test_score_of_parentheses_nested():
    assert score_of_parentheses("(())") == 2


def test_score_of_parentheses_adjacent():
    assert score_of_parentheses("()()") == 2


def test_score_of_parentheses_mixed():
    assert score_of_parentheses("(()(()))") == 6


def test_score_of_parentheses_deep():
    assert score_of_parentheses("(((())))") == 8
