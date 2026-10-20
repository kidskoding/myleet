from solution import CustomStack


def test_custom_stack_example():
    stack = CustomStack(3)
    stack.push(1)
    stack.push(2)
    assert stack.pop() == 2
    stack.push(2)
    stack.push(3)
    stack.push(4)
    stack.increment(5, 100)
    stack.increment(2, 100)
    assert stack.pop() == 103
    assert stack.pop() == 202
    assert stack.pop() == 201
    assert stack.pop() == -1


def test_custom_stack_pop_empty():
    assert CustomStack(2).pop() == -1


def test_custom_stack_increment_empty_is_noop():
    stack = CustomStack(2)
    stack.increment(3, 5)
    stack.push(1)
    assert stack.pop() == 1


def test_custom_stack_respects_max_size_one():
    stack = CustomStack(1)
    stack.push(7)
    stack.push(8)
    assert stack.pop() == 7
    assert stack.pop() == -1


def test_custom_stack_increment_survives_partial_pops():
    stack = CustomStack(4)
    for x in (1, 2, 3, 4):
        stack.push(x)
    stack.increment(3, 10)
    assert stack.pop() == 4
    stack.push(5)
    assert stack.pop() == 5
    assert stack.pop() == 13
    stack.increment(1, 1)
    assert stack.pop() == 12
    assert stack.pop() == 12
