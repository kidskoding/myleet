from solution import remove_invalid_parentheses


def test_remove_invalid_parentheses_normal():
    assert sorted(remove_invalid_parentheses("()())()")) == ["(())()", "()()()"]


def test_remove_invalid_parentheses_removes_everything():
    assert remove_invalid_parentheses(")(") == [""]
