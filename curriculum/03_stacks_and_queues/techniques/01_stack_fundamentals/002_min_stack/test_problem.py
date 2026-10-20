from solution import MinStack


def test_min_stack_tracks_running_minimum():
    stack = MinStack()
    stack.push(-2)
    stack.push(0)
    stack.push(-3)
    assert stack.get_min() == -3
    stack.pop()
    assert stack.top() == 0
    assert stack.get_min() == -2


def test_min_stack_single_element():
    stack = MinStack()
    stack.push(5)
    assert stack.top() == 5
    assert stack.get_min() == 5
