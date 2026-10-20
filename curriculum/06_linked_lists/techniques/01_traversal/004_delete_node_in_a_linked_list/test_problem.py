from list_node import ListNode
from solution import delete_node


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


def node_at(head: ListNode | None, index: int) -> ListNode | None:
    for _ in range(index):
        head = head.next
    return head


def test_delete_node_middle():
    head = build_list([4, 5, 1, 9])
    delete_node(node_at(head, 1))
    assert to_list(head) == [4, 1, 9]


def test_delete_node_deeper_in_the_list():
    head = build_list([1, 2, 3, 4, 5])
    delete_node(node_at(head, 2))

    assert to_list(head) == [1, 2, 4, 5]


def test_delete_node_second_to_last():
    head = build_list([1, 2])
    delete_node(head)

    assert to_list(head) == [2]
