from list_node import ListNode
from solution import remove_zero_sum_sublists


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_remove_zero_sum_sublists_middle_run():
    assert to_list(remove_zero_sum_sublists(build_list([1, 2, -3, 3, 1]))) == [3, 1]


def test_remove_zero_sum_sublists_alternate_valid():
    result = to_list(remove_zero_sum_sublists(build_list([1, 2, 3, -3, 4])))
    assert result == [1, 2, 4]


def test_remove_zero_sum_sublists_all_cancel():
    assert to_list(remove_zero_sum_sublists(build_list([1, 2, 3, -3, -2]))) == [1]


def test_remove_zero_sum_sublists_entire_list_zero():
    assert remove_zero_sum_sublists(build_list([1, -1])) is None
