from list_node import ListNode
from solution import remove_zero_sum_sublists


def build(values: list[int]) -> ListNode | None:
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def to_list(head: ListNode | None) -> list[int]:
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out


def test_remove_zero_sum_two_valid_answers():
    assert to_list(remove_zero_sum_sublists(build([1, 2, -3, 3, 1]))) in ([3, 1], [1, 2, 1])


def test_remove_zero_sum_middle_run():
    assert to_list(remove_zero_sum_sublists(build([1, 2, 3, -3, 4]))) == [1, 2, 4]


def test_remove_zero_sum_nested_runs():
    assert to_list(remove_zero_sum_sublists(build([1, 2, 3, -3, -2]))) == [1]


def test_remove_zero_sum_single_zero():
    assert remove_zero_sum_sublists(build([0])) is None


def test_remove_zero_sum_whole_list():
    assert remove_zero_sum_sublists(build([1, -1])) is None


def test_remove_zero_sum_nothing_to_remove():
    assert to_list(remove_zero_sum_sublists(build([1, 2, 3]))) == [1, 2, 3]


def test_remove_zero_sum_leading_zeros():
    assert to_list(remove_zero_sum_sublists(build([0, 0, 5]))) == [5]
