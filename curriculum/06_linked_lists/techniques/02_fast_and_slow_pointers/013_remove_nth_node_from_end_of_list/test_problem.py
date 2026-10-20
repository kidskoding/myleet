from list_node import ListNode
from solution import remove_nth_from_end


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


def test_remove_nth_from_end_middle():
    head = build_list([1, 2, 3, 4, 5])
    assert to_list(remove_nth_from_end(head, 2)) == [1, 2, 3, 5]


def test_remove_nth_from_end_head():
    head = build_list([1, 2])
    assert to_list(remove_nth_from_end(head, 2)) == [2]


def test_remove_nth_from_end_single():
    assert remove_nth_from_end(build_list([1]), 1) is None
